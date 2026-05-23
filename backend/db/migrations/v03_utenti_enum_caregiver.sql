-- PharmaTimer F3-S4-alpha CP2-FIX3 N+5.E-alpha
-- Migration v03: extend utenti.ruolo ENUM to include 'caregiver'.
--
-- Origin: drift-doc-N46 (Spec v1.5 sez. 3.9 declares ruolo
-- ENUM('owner','paziente','caregiver') but PROD+TEST DDL only had
-- ENUM('owner','paziente'). Empirically verified via information_schema
-- introspection in CP2-FIX3 step 0 (Lesson #23 schema-first MANDATORY).
--
-- Append-safe: existing 'owner'+'paziente' rows preserved unchanged.
-- Sub-AMB cp2-err-N3.B: append 'caregiver' at tail, no reorder.
--
-- Wrapper apply_v03_utenti_enum_caregiver.py provides idempotency check
-- via post-ALTER re-introspection and supports --db {prod,test,both}.

ALTER TABLE utenti
    MODIFY COLUMN ruolo ENUM('owner','paziente','caregiver') NOT NULL;
