# Security Specification - QR Dine & Order System

## 1. Data Invariants
1. **Menu Item Integrity**: Every food item must have a valid non-empty name, a non-negative price, a category, and explicit availability state.
2. **Order Constraints**: An order must specify a table ID, a valid non-negative totalPrice, a timestamp, and a list of items. Status can only progress through 'New', 'Preparing', 'Ready', and 'Served'.
3. **Settings Constraints**: Restaurant settings must hold a non-empty name, a currency symbol, and a positive count of dining tables.

## 2. The "Dirty Dozen" Malicious Payloads

### Menu Collection (`/menu/{menuItemId}`)
- **Payload 1: Price Spoofing (Negative Price)**
  ```json
  { "name": "Biryani", "price": -50, "category": "Main Course", "isVeg": false, "isAvailable": true }
  ```
- **Payload 2: Title Poisoning (Extremely Long Title)**
  ```json
  { "name": "Biryani".repeat(500), "price": 250, "category": "Main Course", "isVeg": false, "isAvailable": true }
  ```
- **Payload 3: Missing Required Fields**
  ```json
  { "price": 250, "isVeg": false, "isAvailable": true }
  ```
- **Payload 4: Invalid Types**
  ```json
  { "name": "Biryani", "price": "cheap", "category": "Main Course", "isVeg": "yes", "isAvailable": true }
  ```

### Orders Collection (`/orders/{orderId}`)
- **Payload 5: Negative Order Total**
  ```json
  { "tableId": "4", "status": "New", "timestamp": 1721000000000, "items": [], "totalPrice": -100 }
  ```
- **Payload 6: Invalid Status Value**
  ```json
  { "tableId": "4", "status": "Delivered_to_home", "timestamp": 1721000000000, "items": [], "totalPrice": 150 }
  ```
- **Payload 7: Empty Table ID**
  ```json
  { "tableId": "", "status": "New", "timestamp": 1721000000000, "items": [], "totalPrice": 200 }
  ```
- **Payload 8: Injection of Ghost fields**
  ```json
  { "tableId": "4", "status": "New", "timestamp": 1721000000000, "items": [], "totalPrice": 150, "maliciousGhostField": true }
  ```

### Settings Collection (`/settings/{settingsId}`)
- **Payload 9: Invalid Table Count (Negative)**
  ```json
  { "name": "Flavors of India", "currency": "₹", "tablesCount": -5 }
  ```
- **Payload 10: Missing currency symbol**
  ```json
  { "name": "Flavors of India", "tablesCount": 10 }
  ```
- **Payload 11: Invalid currency type**
  ```json
  { "name": "Flavors of India", "currency": 123, "tablesCount": 10 }
  ```
- **Payload 12: Injection of administrative config**
  ```json
  { "name": "Flavors of India", "currency": "₹", "tablesCount": 10, "isAdminOverride": true }
  ```

## 3. Test Runner Specification (`firestore.rules.test.ts`)

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

describe("Dine-In System Security Rules", () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "gen-lang-client-0003511734",
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it("fails when attempting to write a menu item with a negative price", async () => {
    const context = testEnv.unauthenticatedContext();
    await assertFails(
      context.firestore().collection("menu").add({
        name: "Biryani",
        price: -50,
        category: "Main Course",
        isVeg: false,
        isAvailable: true
      })
    );
  });

  it("fails when trying to place an order with negative totalPrice", async () => {
    const context = testEnv.unauthenticatedContext();
    await assertFails(
      context.firestore().collection("orders").add({
        tableId: "4",
        status: "New",
        timestamp: Date.now(),
        items: [],
        totalPrice: -100
      })
    );
  });

  it("fails when adding settings with invalid tablesCount", async () => {
    const context = testEnv.unauthenticatedContext();
    await assertFails(
      context.firestore().collection("settings").doc("restaurant_info").set({
        name: "Flavors of India",
        currency: "₹",
        tablesCount: -5
      })
    );
  });
});
```
