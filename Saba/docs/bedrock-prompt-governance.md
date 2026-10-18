# Amazon Bedrock Prompt Governance, Deterministic Safety Rails & Action Plan Audit

## 1. Architectural Mandate

AERIS incorporates an autonomous agentic decision layer powered by Amazon Bedrock. Unlike standard conversational LLM applications, the AERIS agent operates in high-stakes public health and municipal emergency dispatch scenarios. An ungrounded recommendation, fabricated facility name, or hallucinated chemical intervention could misdirect critical civic resources.

This specification enforces strict prompt governance, temperature locks, schema validation firewalls, and deterministic verification protocols.

---

## 2. Model Configuration & Invocation Parameters

```
+-------------------------------------------------------------+
| Model Identifier: anthropic.claude-3-5-sonnet-20241022-v2:0 |
+-------------------------------------------------------------+
| Ingestion & Schema Parameters:                              |
| - Temperature: 0.0 (Strict Determinism)                     |
| - Top-P: 0.1                                                |
| - Max Tokens: 2,500                                         |
| - Stop Sequences: ["</aeris_action_plan>"]                  |
+-------------------------------------------------------------+
```

### 2.1. Fallback & Throttling Circuit Breaker
If AWS Bedrock encounters `ThrottlingException` or execution latency exceeds $8,000\text{ ms}$:
1. **Secondary LLM Fallback**: Automatic failover to `anthropic.claude-3-haiku-20240307-v1:0` with an identical system prompt.
2. **Deterministic Rules Fallback**: If secondary invocation fails, the system executes `rules_engine.py` (a deterministic lookup table mapping $\Delta\text{PM}_{2.5}$ tiers to standardized CAQM GRAP IV advisory templates).

---

## 3. Strict Grounding & Anti-Hallucination Guardrails

The Bedrock system prompt is compiled dynamically with immutable system constraints:

```xml
<system_constraints>
1. YOU ARE A STRICTLY CONSTRAINED PUBLIC HEALTH INTELLIGENCE AGENT.
2. ALL RECOMMENDATIONS MUST BE GROUNDED ENTIRELY IN THE PROVIDED RECEPTOR RANKING JSON.
3. NEVER INVENT, ESTIMATE, OR HALLUCINATE ANY FACILITY NAME, ADDRESS, COORDINATE, OR POPULATION NUMBER.
4. IF A FACILITY IS NOT EXPLICITLY LISTED IN THE INPUT PAYLOAD, YOU ARE FORBIDDEN FROM REFERENCING IT.
5. EVERY ACTION MUST CITE THE PRECISE receptor_id AND eta_minutes PROVIDED.
6. OUTPUT MUST BE A SINGLE, VALID JSON OBJECT MATCHING THE AERIS_ACTION_SCHEMA.
</system_constraints>
```

---

## 4. Post-Inference Deterministic Validation Pipeline

The raw JSON payload returned by Bedrock must traverse three sequential validation stages before publication to the API or web console:

```
Bedrock LLM Output
        │
        ▼ Stage 1
JSON Structural Parser (RFC 8259)
        │
        ▼ Stage 2
Zod Strict Schema Validation (TypeScript / Python Pydantic)
        │
        ▼ Stage 3
Deterministic Grounding Assertion:
  ∀ site ∈ action_plan.sites:
    assert site.receptor_id ∈ input_payload.ranked_receptors
    assert site.eta_minutes == input_payload[site.receptor_id].eta
        │
        ▼ Pass
Operator Console / API Dispatch
```

### 4.1. TypeScript Zod Contract
```typescript
import { z } from 'zod';

export const BedrockActionItemSchema = z.object({
  action_id: z.string().uuid(),
  receptor_id: z.string().regex(/^rec_[a-z0-9_]+$/),
  priority_tier: z.enum(['IMMEDIATE_LIFE_SAFETY', 'HIGH_URGENCY', 'STANDARD_ADVISORY']),
  target_entity: z.string().min(3).max(120),
  eta_arrival_minutes: z.number().int().nonnegative(),
  recommended_interventions: z.array(z.string().min(5).max(250)).min(1).max(5),
  statutory_basis: z.enum(['GRAP_STAGE_IV', 'EP_ACT_1986', 'CAQM_DIRECTIVE_73']),
  verification_checksum: z.string().length(64)
});

export const BedrockActionPlanSchema = z.object({
  plan_id: z.string().uuid(),
  generation_timestamp: z.string().datetime(),
  model_id: z.string(),
  active_corridor_id: z.string(),
  total_actions: z.number().int().positive(),
  actions: z.array(BedrockActionItemSchema)
});
```

---

## 5. Audit Logging & Compliance Ledger

Every generated action plan is hashed using SHA-256 alongside its input telemetry vector and stored in an append-only AWS S3 governance bucket:

- **Location**: `s3://aeris-governance-audit/actions/YYYY/MM/DD/{plan_id}.json`
- **Retention**: 7 years compliant with Central Pollution Control Board statutory environmental inquiry guidelines.
- **Operator Overrides**: If a duty officer edits or rejects a Bedrock recommendation in the UI, the officer's rationalization note, badge number, and pre/post diff are appended to the audit ledger.
