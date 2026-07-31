# Export Guide

Async exports use BullMQ queue `analytics` job `analytics.export`.

Correlation fields from Transaction Context travel on the job payload (`__tx`).

Download path is the linked `media_files.object_key` in local/S3 storage.

JSON exports skip the async path and return payload immediately.
