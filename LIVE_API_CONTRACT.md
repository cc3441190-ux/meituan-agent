# Live API Contract

当前前端 `live` 模式会调用以下后端接口（`VITE_API_BASE_URL`）：

## 1) POI

- `POST /poi/search`
  - req: `{ "type": string, "constraints": Constraints }`
  - res: `POI`

- `POST /poi/inventory`
  - req: `{ "poiId": string, "timeSlot"?: string(ISO) }`
  - res: `{ "available": boolean, "queue"?: number, "reason"?: string }`

- `POST /poi/route`
  - req: `{ "from":[number,number], "to":[number,number] }`
  - res: `{ "distance": string, "duration": number, "mode": string }`

## 2) Booking / Deliverable

- `POST /booking/book`
  - req: `{ "poiId": string, "timeSlot"?: string, "meta"?: object }`
  - res: `BookingResult`

- `POST /booking/cancel`
  - req: `{ "orderId": string }`
  - res: `{ "ok": boolean }`

- `POST /booking/deliverable`
  - req: `{ "deliverable": Deliverable }`（`scheduledAt` 为 ISO 字符串）
  - res: `BookingResult`

## 3) LLM

`HttpPlanningService`、`HttpShareService` 走 OpenAI-Compatible：

- `${VITE_LLM_BASE_URL}/chat/completions`
- Header: `Authorization: Bearer ${VITE_LLM_API_KEY}`

---

`BookingResult` 结构：

```json
{
  "success": true,
  "orderId": "ORD123",
  "message": "预订成功",
  "eta": "18:20",
  "fallback": null
}
```
