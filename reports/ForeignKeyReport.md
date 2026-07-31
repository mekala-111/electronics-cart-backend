# Foreign Key Report

Public tables: **280**
Foreign keys: **988**

[PASS] Found 988 foreign keys

[PASS] No orphan FK references detected
## FK inventory (sample)

| Table | Column | → | On delete |
| --- | --- | --- | --- |
| ab_test_results | created_by | users.id | SET NULL |
| ab_test_results | test_id | ab_tests.id | CASCADE |
| ab_test_results | updated_by | users.id | SET NULL |
| ab_test_results | variant_id | ab_test_variants.id | CASCADE |
| ab_test_variants | created_by | users.id | SET NULL |
| ab_test_variants | test_id | ab_tests.id | CASCADE |
| ab_test_variants | updated_by | users.id | SET NULL |
| ab_tests | created_by | users.id | SET NULL |
| ab_tests | updated_by | users.id | SET NULL |
| activity_logs | user_id | users.id | SET NULL |
| alert_history | acknowledged_by | users.id | SET NULL |
| alert_history | rule_id | alert_rules.id | CASCADE |
| alert_notifications | created_by | users.id | SET NULL |
| alert_notifications | rule_id | alert_rules.id | CASCADE |
| alert_notifications | updated_by | users.id | SET NULL |
| alert_rules | created_by | users.id | SET NULL |
| alert_rules | updated_by | users.id | SET NULL |
| api_request_logs | user_id | users.id | SET NULL |
| archive_jobs | created_by | users.id | SET NULL |
| archive_jobs | policy_id | retention_policies.id | RESTRICT |
| archive_jobs | updated_by | users.id | SET NULL |
| attribute_values | attribute_id | attributes.id | CASCADE |
| attribute_values | created_by | users.id | SET NULL |
| attribute_values | updated_by | users.id | SET NULL |
| attributes | created_by | users.id | SET NULL |
| attributes | updated_by | users.id | SET NULL |
| audit_logs | performed_by | users.id | SET NULL |
| awb_numbers | created_by | users.id | SET NULL |
| awb_numbers | partner_id | shipping_partners.id | RESTRICT |
| awb_numbers | shipment_id | shipments.id | SET NULL |
| awb_numbers | updated_by | users.id | SET NULL |
| banner_groups | created_by | users.id | SET NULL |
| banner_groups | updated_by | users.id | SET NULL |
| banners | created_by | users.id | SET NULL |
| banners | group_id | banner_groups.id | SET NULL |
| banners | media_file_id | media_files.id | SET NULL |
| banners | mobile_media_id | media_files.id | SET NULL |
| banners | updated_by | users.id | SET NULL |
| blog_categories | created_by | users.id | SET NULL |
| blog_categories | updated_by | users.id | SET NULL |
| blog_comments | blog_id | blogs.id | CASCADE |
| blog_comments | created_by | users.id | SET NULL |
| blog_comments | parent_id | blog_comments.id | CASCADE |
| blog_comments | updated_by | users.id | SET NULL |
| blog_comments | user_id | users.id | SET NULL |
| blog_tag_map | blog_id | blogs.id | CASCADE |
| blog_tag_map | created_by | users.id | SET NULL |
| blog_tag_map | tag_id | blog_tags.id | CASCADE |
| blog_tag_map | updated_by | users.id | SET NULL |
| blog_tags | created_by | users.id | SET NULL |

_…and 938 more foreign keys._
