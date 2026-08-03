# System Assessment Trafo (SIAT) - Database & Entity Diagrams

Dokumen ini berisi **Entity Relationship Diagram (ERD)** dan **Class Diagram (TypeORM Entities)** terbaru yang merefleksikan skema database Oracle terbaru dari aplikasi SIAT.

> 🎨 **Diagram Draw.io (Editable)**:
> File diagram Draw.io multi-page lengkap dapat dibuka/diedit langsung melalui Draw.io di:
> [docs/diagram.drawio](file:///c:/Users/LENOVO/College/KP/trafo/siat/docs/diagram.drawio)

---

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    ubp ||--o{ unit_pembangkit : "1 to N"
    unit_pembangkit ||--o{ asset : "1 to N"
    jenis_asset ||--o{ asset : "1 to N"
    jenis_asset ||--o{ test_type : "1 to N"
    asset ||--o{ asset_test_type : "1 to N"
    test_type ||--o{ asset_test_type : "1 to N"
    test_type ||--o{ parameter : "1 to N"
    parameter ||--o{ parameter_damage_mechanism : "1 to N"
    damage_mechanism ||--o{ parameter_damage_mechanism : "1 to N"
    parameter ||--o{ criteria : "1 to N"
    asset ||--o{ test_session : "1 to N"
    test_session ||--o{ test_result : "1 to N"
    parameter ||--o{ test_result : "1 to N"
    app_user ||--o{ test_session : "createdBy / validatedBy"
    report_directory ||--o{ report_directory : "parent / children"
    report_directory ||--o{ report_file : "1 to N"
    app_user ||--o{ report_file : "uploadedBy"

    ubp {
        VARCHAR36 id PK
        VARCHAR255 name
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    unit_pembangkit {
        VARCHAR36 id PK
        VARCHAR36 ubp_id FK
        VARCHAR255 name
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    jenis_asset {
        VARCHAR36 id PK
        VARCHAR255 category
        VARCHAR255 name
        VARCHAR1000 info_fields
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    asset {
        VARCHAR36 id PK
        VARCHAR36 unit_pembangkit_id FK
        VARCHAR36 jenis_asset_id FK
        VARCHAR500 name
        INT mfg_year
        VARCHAR100 vector_group
        VARCHAR255 serial_number
        VARCHAR255 manufacture
        VARCHAR255 type
        VARCHAR100 cooling_method
        VARCHAR100 rated_power
        VARCHAR100 frequency
        VARCHAR100 hv_side
        VARCHAR100 hv_rated_current
        VARCHAR100 lv_side
        VARCHAR100 lv_rated_current
        VARCHAR4000 custom_metadata
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    test_type {
        VARCHAR36 id PK
        VARCHAR255 jenis_asset_id FK
        VARCHAR255 name
        INT order_index
        VARCHAR500 standard
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    parameter {
        VARCHAR36 id PK
        VARCHAR36 test_type_id FK
        VARCHAR255 name
        VARCHAR100 unit
        INT order_index
    }

    damage_mechanism {
        VARCHAR100 name PK
    }

    parameter_damage_mechanism {
        VARCHAR36 parameter_id PK_FK
        VARCHAR100 damage_mechanism_name PK_FK
    }

    asset_test_type {
        VARCHAR36 asset_id PK_FK
        VARCHAR36 test_type_id PK_FK
    }

    criteria {
        VARCHAR36 id PK
        VARCHAR36 parameter_id FK
        VARCHAR255 good_value
        VARCHAR255 fair_value
        VARCHAR255 poor_value
        VARCHAR255 bad_value
        TIMESTAMP effective_from
        TIMESTAMP effective_to
        VARCHAR36 created_by
        TIMESTAMP created_at
    }

    test_session {
        VARCHAR36 id PK
        VARCHAR36 asset_id FK
        INT test_year
        VARCHAR100 test_event
        VARCHAR20 status
        VARCHAR36 created_by_id FK
        VARCHAR36 validated_by_id FK
        TIMESTAMP validated_at
        VARCHAR2000 reject_reason
        VARCHAR4000 additional_info_pending
        VARCHAR4000 additional_info
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    test_result {
        VARCHAR36 id PK
        VARCHAR36 test_session_id FK
        VARCHAR36 parameter_id FK
        DECIMAL20_6 value
        SMALLINT is_not_applicable
        DECIMAL10_2 score
        VARCHAR10 judgement
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    app_user {
        VARCHAR36 id PK
        VARCHAR255 name
        VARCHAR255 email
        VARCHAR255 password_hash
        VARCHAR20 role
        VARCHAR2000 allowed_ubp_ids
        SMALLINT is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    report_directory {
        VARCHAR36 id PK
        VARCHAR255 name
        VARCHAR36 parent_id FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    report_file {
        VARCHAR36 id PK
        VARCHAR255 name
        VARCHAR500 file_path
        INT file_size
        VARCHAR100 mime_type
        VARCHAR36 directory_id FK
        VARCHAR36 uploaded_by_id FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    audit_log {
        VARCHAR36 id PK
        VARCHAR36 user_id
        VARCHAR50 action
        VARCHAR100 entity
        VARCHAR36 entity_id
        VARCHAR4000 before_data
        VARCHAR4000 after_data
        TIMESTAMP created_at
    }
```

---

## 2. TypeORM Entity Class Diagram

```mermaid
classDiagram
    class Ubp {
        +static get name(): string
        +id: string
        +name: string
        +createdAt: Date
        +updatedAt: Date
        +unitPembangkit: UnitPembangkit[]
    }

    class UnitPembangkit {
        +static get name(): string
        +id: string
        +name: string
        +ubpId: string
        +createdAt: Date
        +updatedAt: Date
        +ubp: Ubp
        +assets: Asset[]
    }

    class JenisAsset {
        +static get name(): string
        +id: string
        +category: string
        +name: string
        +infoFields: string | null
        +createdAt: Date
        +updatedAt: Date
        +assets: Asset[]
        +testTypes: TestType[]
    }

    class Asset {
        +static get name(): string
        +id: string
        +unitPembangkitId: string
        +jenisAssetId: string
        +name: string
        +mfgYear: number | null
        +vectorGroup: string | null
        +serialNumber: string | null
        +manufacture: string | null
        +type: string | null
        +coolingMethod: string | null
        +ratedPower: string | null
        +frequency: string | null
        +hvSide: string | null
        +hvRatedCurrent: string | null
        +lvSide: string | null
        +lvRatedCurrent: string | null
        +customMetadata: string | null
        +unitPembangkit: UnitPembangkit
        +jenisAsset: JenisAsset
        +testSessions: TestSession[]
        +testTypes: TestType[]
    }

    class TestType {
        +static get name(): string
        +id: string
        +name: string
        +jenisAssetId: string | null
        +orderIndex: number
        +standard: string | null
        +jenisAsset: JenisAsset | null
        +parameters: Parameter[]
        +assets: Asset[]
    }

    class Parameter {
        +static get name(): string
        +id: string
        +testTypeId: string
        +name: string
        +unit: string | null
        +orderIndex: number
        +testType: TestType
        +damageMechanisms: DamageMechanism[]
        +criteria: Criteria[]
        +testResults: TestResult[]
    }

    class DamageMechanism {
        +static get name(): string
        +name: string
        +parameters: Parameter[]
    }

    class Criteria {
        +static get name(): string
        +id: string
        +parameterId: string
        +goodValue: string | null
        +fairValue: string | null
        +poorValue: string | null
        +badValue: string | null
        +effectiveFrom: Date
        +effectiveTo: Date | null
        +createdBy: string
        +parameter: Parameter
    }

    class TestSession {
        +static get name(): string
        +id: string
        +assetId: string
        +testYear: number
        +testEvent: string | null
        +status: DataStatus
        +createdById: string
        +validatedById: string | null
        +validatedAt: Date | null
        +rejectReason: string | null
        +additionalInfoPending: string | null
        +additionalInfo: string | null
        +asset: Asset
        +createdBy: User
        +validatedBy: User | null
        +testResults: TestResult[]
    }

    class TestResult {
        +static get name(): string
        +id: string
        +testSessionId: string
        +parameterId: string
        +value: number | null
        +isNotApplicable: boolean
        +score: number | null
        +judgement: JudgementLabel | null
        +testSession: TestSession
        +parameter: Parameter
    }

    class User {
        +static get name(): string
        +id: string
        +name: string
        +email: string
        +passwordHash: string
        +role: UserRole
        +allowedUbpIds: string | null
        +isActive: boolean
        +createdSessions: TestSession[]
        +validatedSessions: TestSession[]
    }

    class ReportDirectory {
        +static get name(): string
        +id: string
        +name: string
        +parentId: string | null
        +parent: ReportDirectory | null
        +children: ReportDirectory[]
        +files: ReportFile[]
    }

    class ReportFile {
        +static get name(): string
        +id: string
        +name: string
        +filePath: string
        +fileSize: number
        +mimeType: string
        +directoryId: string
        +uploadedById: string
        +directory: ReportDirectory
        +uploadedBy: User
    }

    class AuditLog {
        +static get name(): string
        +id: string
        +userId: string
        +action: string
        +entity: string
        +entityId: string
        +beforeData: string | null
        +afterData: string | null
        +createdAt: Date
    }

    Ubp "1" --> "*" UnitPembangkit : unitPembangkit
    UnitPembangkit "1" --> "*" Asset : assets
    JenisAsset "1" --> "*" Asset : assets
    JenisAsset "1" --> "*" TestType : testTypes
    Asset "*" <--> "*" TestType : testTypes
    TestType "1" --> "*" Parameter : parameters
    Parameter "*" <--> "*" DamageMechanism : damageMechanisms
    Parameter "1" --> "*" Criteria : criteria
    Asset "1" --> "*" TestSession : testSessions
    TestSession "1" --> "*" TestResult : testResults
    Parameter "1" --> "*" TestResult : testResults
    User "1" --> "*" TestSession : created/validated
    ReportDirectory "1" --> "*" ReportDirectory : children
    ReportDirectory "1" --> "*" ReportFile : files
    User "1" --> "*" ReportFile : uploadedFiles
```
