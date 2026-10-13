# AERIS Control Room Emergency Drill & Incident Response Runbook

**Document Code**: AERIS-RUNBOOK-CR-02  
**Target Operations**: Control Room Incident Supervisors, Emergency Coordination Officers.

---

## 1. Drill Execution Framework

To ensure shift readiness before the peak stubble-burning window, operations teams execute weekly simulation drills using the offline replay datasets preserved in `web/public/data/`.

### Drill Protocol Checklist
1. **Scenario Load**:
   - Verify that the 227-fire detection input triggers 22 candidate clusters.
   - Verify that plume transport advection draws corridors towards South-East Delhi.
2. **Receptor Ranking Verification**:
   - Inspect `/shield` to verify that schools and hospitals within the 0–2h envelope are assigned `CRITICAL` badges.
   - Validate that hospital receptor cards display oxygen plant and emergency ward HVAC alert recommendations.
3. **Bedrock AI Output Audit**:
   - Validate that the generated recommendations match the ranked receptor list and avoid generic ungrounded prose.

---

## 2. Escalation Communications Flow

When a Tier 3 emergency is declared ($R \ge 3.0$ with ETA $< 2\,\text{hours}$):

```
[AERIS Duty Officer]
         │
         ├──► 1. Trigger Bedrock Action Plan Export (JSON & Markdown)
         │
         ├──► 2. Dispatch Automated Telemetry Packet to Delhi Traffic Police
         │       (To reroute heavy diesel freight vehicles away from corridor)
         │
         ├──► 3. Send SMS / WhatsApp Critical Alert to Principal Medical Officers
         │       (Hospital oxygen wards transition to internal air filtration)
         │
         └──► 4. Archive Incident Hash & Run Lineage to Gold S3 Bucket
```

---

## 3. Post-Incident Review (PIR) Checklist

Within 24 hours of an acute pollution episode:
- Compare forecast arrival times with ground AQI station spikes in `/analytics`.
- Document any model divergence due to unexpected surface temperature inversions or calm wind stalls ($u < 1.0\,\text{m/s}$).
- Log incident metrics in the permanent operational archive.
