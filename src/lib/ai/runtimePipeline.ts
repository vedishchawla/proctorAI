// ========================================
// ProctorAI — Kafka-Style Runtime Pipeline
// Topic-based producer/consumer message streaming
// ========================================
//
// This module implements a Kafka-compatible event pipeline
// for the ProctorAI monitoring system. Each AI channel acts
// as a producer that publishes messages to named topics.
// The fusion engine subscribes as a consumer group.
//
// Architecture mirrors Apache Kafka:
//   Producer → Topic → Consumer Group → Processing
//
// Topics:
//   signals.face, signals.gaze, signals.headPose,
//   signals.audio, signals.interaction,
//   signals.fused, trust.scores, violations, pipeline.metrics

import { eventBus } from "./eventBus";

// ── Kafka-style Message Record ───────────────────────
export interface PipelineRecord<T = unknown> {
    topic: string;
    key: string;
    value: T;
    timestamp: number;
    offset: number;
    partition: number;
    headers?: Record<string, string>;
}

// ── Topic Configuration ──────────────────────────────
export interface TopicConfig {
    name: string;
    partitions: number;
    retentionMs: number;
    maxBufferSize: number;
}

// ── Consumer Group ───────────────────────────────────
export interface ConsumerConfig {
    groupId: string;
    topics: string[];
    onMessage: (record: PipelineRecord) => void;
    batchSize?: number;
}

// ── Pipeline Metrics ─────────────────────────────────
export interface PipelineMetrics {
    totalMessagesProduced: number;
    totalMessagesConsumed: number;
    messagesPerSecond: number;
    avgLatencyMs: number;
    topicLag: Record<string, number>;
    channelThroughput: Record<string, number>;
    uptime: number;
    lastProduceTime: number;
    lastConsumeTime: number;
}

// ── Topic Names ──────────────────────────────────────
export const TOPICS = {
    SIGNAL_FACE: "signals.face",
    SIGNAL_GAZE: "signals.gaze",
    SIGNAL_HEAD_POSE: "signals.headPose",
    SIGNAL_AUDIO: "signals.audio",
    SIGNAL_INTERACTION: "signals.interaction",
    SIGNAL_FUSED: "signals.fused",
    TRUST_SCORES: "trust.scores",
    VIOLATIONS: "violations",
    PIPELINE_METRICS: "pipeline.metrics",
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

// ── Topic Partition (in-memory log) ──────────────────
class TopicPartition {
    private log: PipelineRecord[] = [];
    private offset = 0;
    private maxSize: number;
    private retentionMs: number;

    constructor(maxSize = 200, retentionMs = 60000) {
        this.maxSize = maxSize;
        this.retentionMs = retentionMs;
    }

    append(record: PipelineRecord): number {
        record.offset = this.offset++;
        this.log.push(record);
        if (this.log.length > this.maxSize) {
            this.log = this.log.slice(-this.maxSize);
        }
        return record.offset;
    }

    getFrom(fromOffset: number): PipelineRecord[] {
        return this.log.filter((r) => r.offset >= fromOffset);
    }

    getLatest(count: number): PipelineRecord[] {
        return this.log.slice(-count);
    }

    getAll(): PipelineRecord[] {
        return [...this.log];
    }

    size(): number {
        return this.log.length;
    }

    latestOffset(): number {
        return this.offset;
    }

    gc(): void {
        const cutoff = Date.now() - this.retentionMs;
        this.log = this.log.filter((r) => r.timestamp >= cutoff);
    }
}

// ── Consumer Group State ─────────────────────────────
interface ConsumerGroupState {
    groupId: string;
    topics: string[];
    committedOffsets: Map<string, number>;
    handler: (record: PipelineRecord) => void;
    batchSize: number;
    active: boolean;
}

// ═══════════════════════════════════════════════════════
// RUNTIME PIPELINE — Kafka-compatible in-process broker
// ═══════════════════════════════════════════════════════
class RuntimePipeline {
    private topics: Map<string, TopicPartition[]> = new Map();
    private topicConfigs: Map<string, TopicConfig> = new Map();
    private consumerGroups: Map<string, ConsumerGroupState> = new Map();
    private metrics: PipelineMetrics;
    private startTime: number;
    private produceCountWindow: number[] = [];
    private latencyBuffer: number[] = [];
    private gcInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.startTime = Date.now();
        this.metrics = this.defaultMetrics();
        this.createDefaultTopics();
        this.gcInterval = setInterval(() => this.runGC(), 10000);
    }

    private defaultMetrics(): PipelineMetrics {
        return {
            totalMessagesProduced: 0,
            totalMessagesConsumed: 0,
            messagesPerSecond: 0,
            avgLatencyMs: 0,
            topicLag: {},
            channelThroughput: {},
            uptime: 0,
            lastProduceTime: 0,
            lastConsumeTime: 0,
        };
    }

    private createDefaultTopics(): void {
        const defaults: TopicConfig[] = [
            { name: TOPICS.SIGNAL_FACE, partitions: 1, retentionMs: 30000, maxBufferSize: 120 },
            { name: TOPICS.SIGNAL_GAZE, partitions: 1, retentionMs: 30000, maxBufferSize: 120 },
            { name: TOPICS.SIGNAL_HEAD_POSE, partitions: 1, retentionMs: 30000, maxBufferSize: 120 },
            { name: TOPICS.SIGNAL_AUDIO, partitions: 1, retentionMs: 30000, maxBufferSize: 120 },
            { name: TOPICS.SIGNAL_INTERACTION, partitions: 1, retentionMs: 30000, maxBufferSize: 120 },
            { name: TOPICS.SIGNAL_FUSED, partitions: 1, retentionMs: 60000, maxBufferSize: 240 },
            { name: TOPICS.TRUST_SCORES, partitions: 1, retentionMs: 120000, maxBufferSize: 480 },
            { name: TOPICS.VIOLATIONS, partitions: 1, retentionMs: 300000, maxBufferSize: 100 },
            { name: TOPICS.PIPELINE_METRICS, partitions: 1, retentionMs: 60000, maxBufferSize: 60 },
        ];
        for (const config of defaults) {
            this.createTopic(config);
        }
    }

    createTopic(config: TopicConfig): void {
        if (this.topics.has(config.name)) return;
        const partitions: TopicPartition[] = [];
        for (let i = 0; i < config.partitions; i++) {
            partitions.push(new TopicPartition(config.maxBufferSize, config.retentionMs));
        }
        this.topics.set(config.name, partitions);
        this.topicConfigs.set(config.name, config);
    }

    // ── Producer ─────────────────────────────────────
    produce<T>(topic: string, key: string, value: T, headers?: Record<string, string>): PipelineRecord<T> {
        const partitions = this.topics.get(topic);
        if (!partitions) {
            this.createTopic({ name: topic, partitions: 1, retentionMs: 60000, maxBufferSize: 200 });
            return this.produce(topic, key, value, headers);
        }

        const partitionIndex = this.hashKey(key, partitions.length);
        const partition = partitions[partitionIndex];

        const record: PipelineRecord<T> = {
            topic,
            key,
            value,
            timestamp: Date.now(),
            offset: 0,
            partition: partitionIndex,
            headers,
        };

        partition.append(record as PipelineRecord);

        this.metrics.totalMessagesProduced++;
        this.metrics.lastProduceTime = record.timestamp;
        this.produceCountWindow.push(record.timestamp);

        this.dispatchToConsumers(topic, record as PipelineRecord);
        eventBus.emit(`pipeline:${topic}`, record);

        return record;
    }

    // ── Consumer Registration ────────────────────────
    subscribe(config: ConsumerConfig): () => void {
        const state: ConsumerGroupState = {
            groupId: config.groupId,
            topics: config.topics,
            committedOffsets: new Map(),
            handler: config.onMessage,
            batchSize: config.batchSize || 1,
            active: true,
        };

        for (const topic of config.topics) {
            const partitions = this.topics.get(topic);
            if (partitions) {
                state.committedOffsets.set(topic, partitions[0].latestOffset());
            } else {
                state.committedOffsets.set(topic, 0);
            }
        }

        this.consumerGroups.set(config.groupId, state);

        return () => {
            state.active = false;
            this.consumerGroups.delete(config.groupId);
        };
    }

    private dispatchToConsumers(topic: string, record: PipelineRecord): void {
        const now = Date.now();
        for (const [, group] of this.consumerGroups) {
            if (!group.active || !group.topics.includes(topic)) continue;
            try {
                group.handler(record);
                group.committedOffsets.set(topic, record.offset + 1);
                this.metrics.totalMessagesConsumed++;
                this.metrics.lastConsumeTime = now;
                const latency = now - record.timestamp;
                this.latencyBuffer.push(latency);
                if (this.latencyBuffer.length > 100) this.latencyBuffer.shift();
            } catch (err) {
                console.error(`[Pipeline] Consumer "${group.groupId}" error on "${topic}":`, err);
            }
        }
    }

    // ── Query Methods ────────────────────────────────
    getHistory(topic: string, count: number): PipelineRecord[] {
        const partitions = this.topics.get(topic);
        if (!partitions) return [];
        return partitions[0].getLatest(count);
    }

    getFrom(topic: string, fromOffset: number): PipelineRecord[] {
        const partitions = this.topics.get(topic);
        if (!partitions) return [];
        return partitions[0].getFrom(fromOffset);
    }

    getLag(groupId: string): Record<string, number> {
        const group = this.consumerGroups.get(groupId);
        if (!group) return {};
        const lag: Record<string, number> = {};
        for (const topic of group.topics) {
            const partitions = this.topics.get(topic);
            if (!partitions) continue;
            const latestOffset = partitions[0].latestOffset();
            const committedOffset = group.committedOffsets.get(topic) || 0;
            lag[topic] = Math.max(0, latestOffset - committedOffset);
        }
        return lag;
    }

    // ── Metrics ──────────────────────────────────────
    getMetrics(): PipelineMetrics {
        const now = Date.now();
        const fiveSecondsAgo = now - 5000;
        this.produceCountWindow = this.produceCountWindow.filter((t) => t >= fiveSecondsAgo);
        this.metrics.messagesPerSecond = Math.round((this.produceCountWindow.length / 5) * 10) / 10;

        if (this.latencyBuffer.length > 0) {
            this.metrics.avgLatencyMs =
                Math.round((this.latencyBuffer.reduce((a, b) => a + b, 0) / this.latencyBuffer.length) * 100) / 100;
        }

        const lagMap: Record<string, number> = {};
        for (const [, group] of this.consumerGroups) {
            const groupLag = this.getLag(group.groupId);
            for (const [topic, lag] of Object.entries(groupLag)) {
                lagMap[topic] = (lagMap[topic] || 0) + lag;
            }
        }
        this.metrics.topicLag = lagMap;

        const throughput: Record<string, number> = {};
        for (const [topicName, partitions] of this.topics) {
            const recent = partitions[0].getAll().filter((r) => r.timestamp >= fiveSecondsAgo);
            throughput[topicName] = Math.round((recent.length / 5) * 10) / 10;
        }
        this.metrics.channelThroughput = throughput;
        this.metrics.uptime = now - this.startTime;

        return { ...this.metrics };
    }

    private hashKey(key: string, numPartitions: number): number {
        if (numPartitions === 1) return 0;
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = (hash << 5) - hash + key.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % numPartitions;
    }

    private runGC(): void {
        for (const [, partitions] of this.topics) {
            for (const partition of partitions) {
                partition.gc();
            }
        }
    }

    reset(): void {
        for (const [, group] of this.consumerGroups) {
            group.active = false;
        }
        this.consumerGroups.clear();
        this.topics.clear();
        this.produceCountWindow = [];
        this.latencyBuffer = [];
        this.metrics = this.defaultMetrics();
        this.startTime = Date.now();
        this.createDefaultTopics();
    }

    destroy(): void {
        if (this.gcInterval) {
            clearInterval(this.gcInterval);
            this.gcInterval = null;
        }
        this.consumerGroups.clear();
        this.topics.clear();
    }
}

// ── Singleton Export ──────────────────────────────────
export const runtimePipeline = new RuntimePipeline();
