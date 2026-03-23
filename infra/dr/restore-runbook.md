# UTUBooking — Database Restore Runbook
**RTO Target: 4 hours**
**Region: me-south-1 (Bahrain)**
**Maintained by: AMEC Dev / On-call engineer**

---

## Incident Types

| Scenario | Recovery Method | Expected Time |
|----------|----------------|---------------|
| RDS primary failure | Promote read replica | ~15 minutes |
| Data corruption (partial) | Point-in-time restore (RDS PITR) | ~45 minutes |
| Full data loss | Restore from S3 backup | ~2-3 hours |
| Regional failure | Restore from eu-west-1 replica S3 bucket | ~3-4 hours |

---

## Step 1: Declare Incident [0:00]

1. Page senior engineer via PagerDuty (auto-triggered by `ServiceDown` alert)
2. Join `#incident-response` Slack channel
3. Assign Incident Commander (IC) and Comms Lead
4. Create incident ticket in your issue tracker

---

## Step 2: Assess [0:05]

Determine failure type:

```bash
# Check RDS primary status
aws rds describe-db-instances \
  --db-instance-identifier utu-booking-db \
  --region me-south-1 \
  --query 'DBInstances[0].DBInstanceStatus'

# Check replica replication lag
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ReplicaLag \
  --dimensions Name=DBInstanceIdentifier,Value=utu-booking-db-replica-1 \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average \
  --region me-south-1
```

---

## Step 3a: Primary Failure → Promote Replica [0:10]

```bash
# Promote replica 1 to standalone primary
aws rds promote-read-replica \
  --db-instance-identifier utu-booking-db-replica-1 \
  --region me-south-1

# Wait for promotion (~ 5-10 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier utu-booking-db-replica-1 \
  --region me-south-1

# Get new endpoint
aws rds describe-db-instances \
  --db-instance-identifier utu-booking-db-replica-1 \
  --query 'DBInstances[0].Endpoint.Address' \
  --region me-south-1
```

**[0:20] Update ECS task definitions with new DATABASE_URL:**

```bash
# Update GitHub Secret: DATABASE_URL = postgres://utu_user:<pass>@<new-endpoint>:5432/utu_booking
# Then trigger deploy:
gh workflow run deploy-backend.yml --ref main
```

**[0:50] Verify all services healthy:**

```bash
curl https://api.utubooking.com/health
```

---

## Step 3b: Data Corruption → S3 Restore [0:10]

```bash
# List available backups
aws s3 ls s3://utu-db-backups-<AccountId>/daily/ --region me-south-1 | tail -10

# Create a fresh RDS instance for restore
aws rds create-db-instance \
  --db-instance-identifier utu-booking-db-restored \
  --db-instance-class db.r7g.xlarge \
  --engine postgres \
  --engine-version 16.x \
  --master-username utu_user \
  --master-user-password <password> \
  --db-name utu_booking \
  --db-subnet-group-name utu-db-subnets \
  --vpc-security-group-ids <sg-id> \
  --allocated-storage 100 \
  --storage-type gp3 \
  --no-publicly-accessible \
  --region me-south-1

# Wait for DB to be available (~10-15 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier utu-booking-db-restored

# Restore backup (run on an EC2/ECS instance with pg_restore installed)
export TARGET_DATABASE_URL="postgres://utu_user:<pass>@<restored-endpoint>:5432/utu_booking"
export AWS_BACKUP_BUCKET="utu-db-backups-<AccountId>"
bash infra/scripts/pg-restore.sh   # uses latest backup by default
```

**[2:30] Verify row counts match expectation:**

The restore script prints row counts automatically. Compare with approximate expected values:

| Table | Approximate Rows (normal) |
|-------|--------------------------|
| users | > 10,000 |
| bookings | > 50,000 |
| payments | > 45,000 |
| loyalty_accounts | > 10,000 |
| points_ledger | > 200,000 |

**[3:00] Update DATABASE_URL and redeploy:**

```bash
# Update GitHub Secret then:
gh workflow run deploy-backend.yml --ref main
```

---

## Step 4: Redirect Traffic [3:30]

```bash
# Verify new services are healthy
curl https://api.utubooking.com/health

# Run k6 smoke test
k6 run load-tests/k6/smoke-test.js

# If all passes, the ALB target groups are already pointing to healthy ECS tasks.
# No DNS/ALB changes needed — ECS rolling deploy handles this automatically.
```

---

## Step 5: Incident Resolved [4:00]

1. Confirm all Prometheus alerts resolved in Grafana
2. Update PagerDuty incident to "Resolved"
3. Post recovery message in `#incident-response`
4. Schedule post-mortem within 48 hours
5. Update this runbook if actual steps differed from documented steps

---

## Post-Mortem Template

```
## Incident: <Date> — <Brief description>

### Timeline
- [00:00] Alert triggered
- [00:05] IC declared incident
- [XX:XX] Root cause identified
- [XX:XX] Recovery started
- [XX:XX] Incident resolved

### Root Cause
<1-2 sentences>

### Impact
- Duration: X hours
- Bookings affected: ~N
- Revenue impact: SAR X

### Corrective Actions
- [ ] Action 1 (owner, due date)
- [ ] Action 2 (owner, due date)
```

---

## Key Contacts

| Role | Contact |
|------|---------|
| On-call Engineer | PagerDuty rotation |
| AWS Account | me-south-1 console |
| DB Admin | `#db-ops` Slack |
| Security Lead | `#security` Slack |

---

## Related Files

- `infra/scripts/pg-backup.sh` — daily backup script
- `infra/scripts/pg-restore.sh` — restore from S3
- `infra/cloudformation/04-rds-replicas.yml` — replica CloudFormation
- `infra/cloudformation/06-s3-backups.yml` — backup bucket CloudFormation
- `.github/workflows/backup-verify.yml` — weekly DR drill workflow
