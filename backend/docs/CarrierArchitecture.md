# Carrier Architecture

```
Controllers / Services
        │
        ▼
 ShippingProvider
        │
        ▼
 ShiprocketProvider ── mock | live Shiprocket API
```

Future: Delhivery, BlueDart, DTDC, XpressBees, India Post, DHL, FedEx, UPS — bind `SHIPPING_PROVIDER`.

Credentials: env (`SHIPROCKET_*`) / partner `config_json`. Never return secrets in API responses.
