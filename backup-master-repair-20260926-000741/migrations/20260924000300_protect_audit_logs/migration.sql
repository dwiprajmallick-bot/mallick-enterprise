-- Audit logs are append-only.
-- Existing audit records cannot be updated or deleted.

CREATE TRIGGER "AuditLog_prevent_update"
BEFORE UPDATE ON "AuditLog"
BEGIN
    SELECT RAISE(
        ABORT,
        'AuditLog records are immutable and cannot be updated.'
    );
END;

CREATE TRIGGER "AuditLog_prevent_delete"
BEFORE DELETE ON "AuditLog"
BEGIN
    SELECT RAISE(
        ABORT,
        'AuditLog records are immutable and cannot be deleted.'
    );
END;
