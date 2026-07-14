import React, { useState } from "react";
import { MenuItem, Order, OrderItem, RestaurantSettings, CustomizationGroup } from "../types";
import { db, handleFirestoreError, OperationType, sanitizeData } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, Trash2, Plus, Minus, Check, ChevronRight, X, AlertTriangle, 
  Clock, IndianRupee, MessageSquare, Utensils, ThumbsUp, Sparkles, Smile
} from "lucide-react";

interface CustomerMenuProps {
  menuItems: MenuItem[];
  activeTableId: string | null;
  settings: RestaurantSettings;
  orders: Order[];
  onSelectTable: (tableId: string | null) => void;
}

export default function CustomerMenu({
  menuItems,
  activeTableId,
  settings,
  orders,
  onSelectTable
}: CustomerMenuProps) {
  // Navigation & Category Filtering
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  // Cart state
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Customize Modal State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customQuantity, setCustomQuantity] = useState(1);
  const [selectedSpice, setSelectedSpice] = useState("Medium");
  const [selectedPortion, setSelectedPortion] = useState("Regular");
  const [extraNote, setExtraNote] = useState("");

  const categories = ["All", "Starter", "Main Course", "Bread", "Beverage", "Dessert"];

  const filteredItems = selectedCategory === "All" 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  // Active Orders for this table session
  const tableOrders = orders.filter(
    order => order.tableId === activeTableId && order.status !== "Served"
  );

  const handleOpenCustomize = (item: MenuItem) => {
    setCustomizingItem(item);
    setCustomQuantity(1);
    setSelectedSpice(item.spiceLevel !== "None" ? item.spiceLevel : "Medium");
    setSelectedPortion("Regular");
    setExtraNote("");
  };

  const handleAddToCart = () => {
    if (!customizingItem) return;

    // Calculate customization cost
    let portionAddonCost = 0;
    if (selectedPortion === "Large") {
      portionAddonCost = 40; // Flat addon for demo
    }

    const selections = [
      {
        groupName: "Spice Level",
        optionName: selectedSpice,
        price: 0
      },
      {
        groupName: "Portion Size",
        optionName: selectedPortion,
        price: portionAddonCost
      }
    ];

    const finalPrice = customizingItem.price + portionAddonCost;

    // Unique ID for this specific configured item
    const configuredItemId = `${customizingItem.id}-${selectedSpice}-${selectedPortion}`;

    const existingCartIdx = cart.findIndex(c => c.id === configuredItemId);

    if (existingCartIdx > -1) {
      const updated = [...cart];
      updated[existingCartIdx].quantity += customQuantity;
      setCart(updated);
    } else {
      const cartItem: OrderItem = {
        id: configuredItemId,
        menuItemId: customizingItem.id,
        name: customizingItem.name,
        basePrice: finalPrice,
        quantity: customQuantity,
        isVeg: customizingItem.isVeg,
        selectedCustomizations: selections,
        notes: extraNote || undefined
      };
      setCart([...cart, cartItem]);
    }

    setCustomizingItem(null);
  };

  const handleUpdateCartQty = (id: string, amount: number) => {
    const idx = cart.findIndex(c => c.id === id);
    if (idx === -1) return;

    const copy = [...cart];
    copy[idx].quantity += amount;

    if (copy[idx].quantity <= 0) {
      setCart(cart.filter(c => c.id !== id));
    } else {
      setCart(copy);
    }
  };

  const handlePlaceOrder = async () => {
    if (!activeTableId || cart.length === 0) return;

    const total = cart.reduce((acc, item) => acc + (item.basePrice * item.quantity), 0);

    const orderData: Omit<Order, "id"> = sanitizeData({
      tableId: activeTableId,
      status: "New",
      timestamp: Date.now(),
      items: cart,
      totalPrice: total,
      specialInstructions: specialInstructions || undefined
    });

    try {
      await addDoc(collection(db, "orders"), orderData);
      setCart([]);
      setIsCartOpen(false);
      setSpecialInstructions("");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "orders");
    }
  };

  const getVegIcon = (isVeg: boolean) => {
    return (
      <span className={`inline-flex items-center justify-center border-2 p-0.5 rounded ${isVeg ? "border-green-600" : "border-red-600"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? "bg-green-600" : "bg-red-600"}`}></span>
      </span>
    );
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.basePrice * item.quantity), 0);

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-[calc(100vh-120px)] flex flex-col justify-between font-sans relative border-x border-slate-200 shadow-sm">
      
      {/* 1. TABLE SELECTOR SIMULATOR (IF NO ACTIVE TABLE ID) */}
      {!activeTableId ? (
        <div className="flex-1 p-6 flex flex-col justify-center items-center text-center bg-white">
          <Utensils size={48} className="text-slate-400 mb-4" />
          <h1 className="text-xl font-bold text-slate-800">Dine-In Digital Menu</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-xs">
            To view the restaurant's menu and place orders, select a dining table below (or scan a table QR code).
          </p>

          <div className="grid grid-cols-3 gap-3 w-full mt-8">
            {Array.from({ length: settings.tablesCount }).map((_, idx) => {
              const tableNum = String(idx + 1);
              return (
                <button
                  key={tableNum}
                  onClick={() => onSelectTable(tableNum)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 text-slate-800 font-bold transition hover:shadow-sm"
                >
                  Table {tableNum}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ACTIVE CUSTOMER MENU CONTAINER */
        <div className="flex flex-col flex-1 pb-24">
          {/* Header */}
          <div className="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div>
              <h1 className="text-base font-bold text-slate-800">{settings.name}</h1>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse"></span>
                Dine-in · Table {activeTableId}
              </span>
            </div>
            <button 
              onClick={() => onSelectTable(null)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-800 border border-slate-100 rounded-lg px-2 py-1 bg-slate-50"
            >
              Change Table
            </button>
          </div>

          {/* ACTIVE LIVE ORDERS ON THE TABLE */}
          {tableOrders.length > 0 && (
            <div className="p-3 bg-amber-50/70 border-b border-amber-100/50 space-y-2">
              <div className="flex items-center gap-1 text-xs font-bold text-amber-800">
                <Clock size={14} />
                <span>Your Active Orders:</span>
              </div>
              {tableOrders.map(order => (
                <div key={order.id} className="bg-white/80 border border-amber-100 p-2.5 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Placed {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    order.status === "New" ? "bg-amber-100 text-amber-800" :
                    order.status === "Preparing" ? "bg-blue-100 text-blue-800" :
                    "bg-green-100 text-green-800"
                  }`}>
                    {order.status === "New" ? "Sent to Kitchen" : order.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Horizontal Category Selector */}
          <div className="bg-white py-2.5 px-4 overflow-x-auto flex gap-2 border-b border-slate-50 scrollbar-none sticky top-[48px] z-10 shadow-sm">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition whitespace-nowrap ${
                  selectedCategory === cat 
                    ? "bg-slate-900 text-white" 
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="p-4 space-y-4 flex-1">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No items in this category yet.
              </div>
            ) : (
              filteredItems.map(item => (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-xl border border-slate-100 shadow-sm p-3.5 flex justify-between gap-4 transition hover:shadow-md ${
                    !item.isAvailable && "opacity-60"
                  }`}
                >
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {getVegIcon(item.isVeg)}
                        {item.spiceLevel !== "None" && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            {item.spiceLevel} Spice
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800">
                        {settings.currency}{item.price}
                      </span>
                      {item.isAvailable ? (
                        <button
                          onClick={() => handleOpenCustomize(item)}
                          className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                        >
                          Add <Plus size={12} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dish Image */}
                  {item.image && (
                    <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FLOAT BAR / FOOTER ACTION (CART PREVIEW) */}
      <AnimatePresence>
        {activeTableId && cart.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-[60px] md:bottom-3 max-w-md w-full left-0 right-0 mx-auto px-4 z-20"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-slate-950 text-white hover:bg-slate-900 px-4 py-3.5 rounded-xl shadow-lg flex items-center justify-between transition transform active:scale-95 border border-slate-800"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-emerald-400" />
                <div className="text-left">
                  <div className="text-xs font-bold">{cart.reduce((a, c) => a + c.quantity, 0)} Items Added</div>
                  <div className="text-[10px] text-slate-400">View your cart basket</div>
                </div>
              </div>
              <div className="flex items-center gap-1 font-bold text-sm">
                <span>{settings.currency}{cartTotal}</span>
                <ChevronRight size={16} />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. CUSTOMIZE MODAL DIALOG */}
      <AnimatePresence>
        {customizingItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden flex flex-col max-h-[85vh]"
            >
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                {getVegIcon(customizingItem.isVeg)}
                <h3 className="font-bold text-slate-800 text-sm">Customize Item</h3>
              </div>
              <button 
                onClick={() => setCustomizingItem(null)}
                className="p-1 rounded-full bg-slate-50 text-slate-400 hover:text-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <div>
                <h2 className="text-base font-bold text-slate-800">{customizingItem.name}</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{customizingItem.description}</p>
              </div>

              {/* Spice Options */}
              {customizingItem.spiceLevel !== "None" && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Spice Level</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {["Mild", "Medium", "Hot"].map(spice => (
                      <button
                        key={spice}
                        onClick={() => setSelectedSpice(spice)}
                        className={`py-2 text-xs font-semibold rounded-xl border text-center transition ${
                          selectedSpice === spice 
                            ? "bg-slate-900 text-white border-slate-900" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {spice}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Portion Options */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Select Portion</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "Regular", price: 0 },
                    { name: "Large", price: 40 }
                  ].map(p => (
                    <button
                      key={p.name}
                      onClick={() => setSelectedPortion(p.name)}
                      className={`p-3 text-xs font-semibold rounded-xl border text-left flex justify-between items-center transition ${
                        selectedPortion === p.name 
                          ? "bg-slate-900 text-white border-slate-900" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>{p.name}</span>
                      <span className="opacity-80">
                        {p.price > 0 ? `+${settings.currency}${p.price}` : "Free"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Special Instructions</h4>
                <input
                  type="text"
                  placeholder="e.g. No onions, make it extra dry, extra ginger..."
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Quantity Selector */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">Select Quantity</span>
                <div className="flex items-center gap-4 bg-white rounded-lg px-2.5 py-1 shadow-sm border border-slate-200">
                  <button 
                    onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                    className="p-1 text-slate-400 hover:text-slate-800 transition"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-bold text-slate-800 min-w-4 text-center">{customQuantity}</span>
                  <button 
                    onClick={() => setCustomQuantity(customQuantity + 1)}
                    className="p-1 text-slate-400 hover:text-slate-800 transition"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex gap-3">
              <button
                onClick={() => setCustomizingItem(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                Back to Menu
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition flex items-center justify-center gap-1 shadow-md"
              >
                <Check size={14} /> Add to Basket
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* 3. CART DRAWERS */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden flex flex-col max-h-[85vh]"
            >
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-slate-800" size={18} />
                <h3 className="font-bold text-slate-800 text-sm">Review Order Basket</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-full bg-slate-50 text-slate-400 hover:text-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-4 py-1.5 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="flex items-center gap-1.5">
                      {getVegIcon(item.isVeg)}
                      <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                    </div>
                    
                    {item.selectedCustomizations.length > 0 && (
                      <p className="text-[11px] text-slate-500 ml-5 mt-0.5">
                        {item.selectedCustomizations.map(c => `${c.groupName}: ${c.optionName}`).join(", ")}
                      </p>
                    )}
                    
                    {item.notes && (
                      <p className="text-[10px] text-amber-700 italic ml-5 mt-0.5">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-slate-700">
                      {settings.currency}{item.basePrice * item.quantity}
                    </span>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-0.5 border border-slate-200">
                      <button 
                        onClick={() => handleUpdateCartQty(item.id, -1)}
                        className="p-0.5 text-slate-400 hover:text-slate-800 transition"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-bold text-slate-800 min-w-3 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => handleUpdateCartQty(item.id, 1)}
                        className="p-0.5 text-slate-400 hover:text-slate-800 transition"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Special Instructions for Chef</label>
                <input
                  type="text"
                  placeholder="e.g. Please avoid onions in starter, make chai extra strong..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="pt-4 bg-slate-50 p-4 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span>{settings.currency}{cartTotal}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>GST Taxes (5%)</span>
                  <span>{settings.currency}{Math.round(cartTotal * 0.05)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-800 pt-1.5 border-t border-slate-100">
                  <span>Grand Total</span>
                  <span>{settings.currency}{cartTotal + Math.round(cartTotal * 0.05)}</span>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white sticky bottom-0 z-10">
              <button
                onClick={handlePlaceOrder}
                className="w-full py-3.5 bg-slate-950 text-white hover:bg-slate-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
              >
                <Check size={14} /> Place Order to Kitchen
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}
