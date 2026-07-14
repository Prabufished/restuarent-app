import React, { useState, useEffect } from "react";
import { MenuItem, Order, RestaurantSettings } from "./types";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { 
  collection, onSnapshot, doc, getDoc, setDoc, updateDoc, 
  query, orderBy, addDoc, getDocs 
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import AdminPanel from "./components/AdminPanel";
import CustomerMenu from "./components/CustomerMenu";
import KitchenDisplay from "./components/KitchenDisplay";
import { ChefHat, Sparkles, QrCode, FileText, Settings, Phone, Tablet, Laptop, Info } from "lucide-react";

export default function App() {
  // Navigation: "owner" | "customer" | "kitchen"
  const [activeRole, setActiveRole] = useState<"owner" | "customer" | "kitchen">("owner");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Firestore Data States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>({
    name: "Flavors of India",
    currency: "₹",
    tablesCount: 4
  });
  const [isLoading, setIsLoading] = useState(true);

  // 1. Read URL query parameters to auto-route to table view if scanned via QR
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get("table");
    if (tableParam) {
      setActiveRole("customer");
      setSelectedTable(tableParam);
    }
  }, []);

  // 2. Fetch data from Firestore with Real-Time listeners
  useEffect(() => {
    // A. Seed Database if empty
    const initDb = async () => {
      try {
        const menuCol = collection(db, "menu");
        let menuSnap;
        try {
          menuSnap = await getDocs(menuCol);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, "menu");
          return;
        }
        
        if (menuSnap.empty) {
          console.log("Seeding menu with tasty default Indian dishes...");
          const seedItems = [
            {
              name: "Tandoori Paneer Tikka",
              description: "Fresh cottage cheese cubes marinated in spiced tandoor yogurt and grilled to smoky perfection.",
              price: 240,
              category: "Starter",
              isVeg: true,
              spiceLevel: "Medium",
              isAvailable: true,
              image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
            },
            {
              name: "Butter Chicken (Makhani)",
              description: "Tender chicken cooked in a rich, velvety tomato-butter-cream gravy flavored with fenugreek.",
              price: 360,
              category: "Main Course",
              isVeg: false,
              spiceLevel: "Medium",
              isAvailable: true,
              image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
            },
            {
              name: "Garlic Butter Naan",
              description: "Clay-oven baked flatbread brushed with melted butter, chopped garlic, and cilantro.",
              price: 80,
              category: "Bread",
              isVeg: true,
              spiceLevel: "None",
              isAvailable: true,
              image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
            },
            {
              name: "Creamy Mango Lassi",
              description: "Smooth yogurt shake blended with sweet Alphonso mango pulp and a touch of cardamom.",
              price: 110,
              category: "Beverage",
              isVeg: true,
              spiceLevel: "None",
              isAvailable: true,
              image: "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
            },
            {
              name: "Warm Gulab Jamun",
              description: "Soft, golden-fried milk solid balls soaked in warm saffron-infused sugar syrup.",
              price: 120,
              category: "Dessert",
              isVeg: true,
              spiceLevel: "None",
              isAvailable: true,
              image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
            }
          ];

          for (const item of seedItems) {
            try {
              await addDoc(menuCol, item);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, "menu");
            }
          }
        }

        // Check & Seed settings
        const settingsRef = doc(db, "settings", "restaurant_info");
        let settingsSnap;
        try {
          settingsSnap = await getDoc(settingsRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, "settings/restaurant_info");
          return;
        }

        if (!settingsSnap.exists()) {
          try {
            await setDoc(settingsRef, {
              name: "Flavors of India",
              currency: "₹",
              tablesCount: 4
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, "settings/restaurant_info");
          }
        }
      } catch (err) {
        console.error("Database initialization error:", err);
      }
    };

    initDb().then(() => {
      // Subscriptions
      const unsubMenu = onSnapshot(collection(db, "menu"), (snapshot) => {
        const itemsList: MenuItem[] = [];
        snapshot.forEach((doc) => {
          itemsList.push({ id: doc.id, ...doc.data() } as MenuItem);
        });
        setMenuItems(itemsList);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "menu");
      });

      const unsubOrders = onSnapshot(
        query(collection(db, "orders"), orderBy("timestamp", "desc")),
        (snapshot) => {
          const ordersList: Order[] = [];
          snapshot.forEach((doc) => {
            ordersList.push({ id: doc.id, ...doc.data() } as Order);
          });
          setOrders(ordersList);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "orders");
        }
      );

      const unsubSettings = onSnapshot(doc(db, "settings", "restaurant_info"), (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as RestaurantSettings);
        }
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "settings/restaurant_info");
      });

      return () => {
        unsubMenu();
        unsubOrders();
        unsubSettings();
      };
    });
  }, []);

  const handleUpdateSettings = async (newSettings: RestaurantSettings) => {
    try {
      await setDoc(doc(db, "settings", "restaurant_info"), newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/restaurant_info");
    }
  };

  const handleSelectTableForDemo = (tableId: string) => {
    setSelectedTable(tableId);
    setActiveRole("customer");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans">
        <ChefHat className="animate-bounce text-slate-800 h-10 w-10 mb-2" />
        <h2 className="text-sm font-semibold text-slate-700">Connecting to Cloud Firestore...</h2>
        <p className="text-xs text-slate-400 mt-1">Booting table synchronization channels...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* 1. TOP ROLE SWITCHER TOOLBAR */}
      <header className="bg-slate-900 text-white shadow-md z-40 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <ChefHat className="text-emerald-400" size={24} />
            <div>
              <span className="font-bold tracking-tight text-sm">QR Dine & Order System</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 font-mono">Dine-in Prototype</span>
            </div>
          </div>

          {/* Interactive Role Selector tabs */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/50 w-full md:w-auto">
            <button
              onClick={() => setActiveRole("owner")}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeRole === "owner" 
                  ? "bg-slate-950 text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Laptop size={14} />
              <span>👨‍💼 Owner Panel</span>
            </button>
            
            <button
              onClick={() => setActiveRole("customer")}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeRole === "customer" 
                  ? "bg-slate-950 text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Phone size={14} />
              <span>📱 Customer Menu {selectedTable && `(T${selectedTable})`}</span>
            </button>

            <button
              onClick={() => setActiveRole("kitchen")}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeRole === "kitchen" 
                  ? "bg-slate-950 text-white shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Tablet size={14} />
              <span>👨‍🍳 Chef View</span>
            </button>
          </div>
        </div>
      </header>

      {/* Demo Instructions Banner */}
      <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-100 py-2 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <Info size={14} className="shrink-0" />
          <span className="leading-relaxed">
            <strong>Prototype Demo Guide:</strong> Open 3 browser tabs or side-by-side frames. Add a dish under <strong>Owner Panel</strong>, select <strong>Tables</strong>, click <strong>"Test Table"</strong> to place an order, and watch it pop up instantly on the <strong>Chef View</strong>!
          </span>
        </div>
      </div>

      {/* 2. RENDER SELECTED PANEL */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeRole === "owner" && (
            <motion.div
              key="owner"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <AdminPanel 
                menuItems={menuItems}
                orders={orders}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onSelectTableForDemo={handleSelectTableForDemo}
              />
            </motion.div>
          )}

          {activeRole === "customer" && (
            <motion.div
              key="customer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <CustomerMenu 
                menuItems={menuItems}
                activeTableId={selectedTable}
                settings={settings}
                orders={orders}
                onSelectTable={(tableId) => setSelectedTable(tableId)}
              />
            </motion.div>
          )}

          {activeRole === "kitchen" && (
            <motion.div
              key="kitchen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <KitchenDisplay 
                orders={orders}
                settings={settings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
