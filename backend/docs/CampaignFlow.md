# Campaign Flow

Channels: email / sms / push / notification campaigns.  
Create (draft) → optional launch (lock) → status `running` → BullMQ delivery job → `completed`.

Events: `campaign.started`, `campaign.completed`.  
Audience: `CustomerSegment` (`rules_json` evaluable with RuleEngine when membership is dynamic).
