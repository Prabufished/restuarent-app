import React, { useEffect, useRef } from "react";
import { Order, RestaurantSettings } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { 
  CheckCircle, Clock, Volume2, VolumeX, AlertCircle, RefreshCw, 
  ChefHat, Play, Check, Flame, MessageSquare, AlertTriangle 
} from "lucide-react";

interface KitchenDisplayProps {
  orders: Order[];
  settings: RestaurantSettings;
}

export default function KitchenDisplay({ orders, settings }: KitchenDisplayProps) {
  const activeOrders = orders.filter(order => order.status !== "Served");
  const previousOrdersCountRef = useRef<number>(orders.length);
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  // Synthesize a beautiful double-beep sound for new orders
  const playNewOrderBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      // Play high double chime
      playBeep(880, now, 0.15); // A5
      playBeep(1109, now + 0.18, 0.25); // C#6
    } catch (err) {
      console.warn("AudioContext blocked or uninitialized:", err);
    }
  };

  // Listen for new incoming orders and trigger alert sound
  useEffect(() => {
    const currentNewOrders = orders.filter(o => o.status === "New").length;
    const previousNewOrders = previousOrdersCountRef.current;

    // If there is an increase in the number of 'New' orders, play alert!
    if (orders.length > previousNewOrders) {
      const hasBrandNewOrder = orders.some(o => o.status === "New" && (Date.now() - o.timestamp < 10000));
      if (hasBrandNewOrder) {
        playNewOrderBeep();
      }
    }
    previousOrdersCountRef.current = orders.length;
  }, [orders]);

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus: "Preparing" | "Ready" | "Served" = "Preparing";
    if (currentStatus === "New") nextStatus = "Preparing";
    else if (currentStatus === "Preparing") nextStatus = "Ready";
    else if (currentStatus === "Ready") nextStatus = "Served";

    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: nextStatus
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "border-l-8 border-l-amber-500 bg-amber-50/50";
      case "Preparing": return "border-l-8 border-l-blue-500 bg-blue-50/30";
      case "Ready": return "border-l-8 border-l-emerald-500 bg-emerald-50/30";
      default: return "border-l-8 border-l-slate-300";
    }
  };

  const getStatusTagClass = (status: string) => {
    switch (status) {
      case "New": return "bg-amber-100 text-amber-800 border-amber-200";
      case "Preparing": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Ready": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-900 min-h-[calc(100vh-120px)] text-white font-sans">
      
      {/* Upper bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <ChefHat className="text-emerald-400" />
            Kitchen Display System (KDS)
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time incoming orders, customized dishes, and special instructions queue</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              soundEnabled 
                ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700" 
                : "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700"
            }`}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{soundEnabled ? "Sound On" : "Sound Muted"}</span>
          </button>

          {/* Test Sound button */}
          {soundEnabled && (
            <button
              onClick={playNewOrderBeep}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Test the chime sound"
            >
              <RefreshCw size={12} className="animate-spin-slow" />
              <span>Test Chime</span>
            </button>
          )}
          
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-emerald-400 border border-slate-700">
            <span className="w-1.5 h-1.5 mr-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Live Queue ({activeOrders.length})
          </span>
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <div className="text-center py-24 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 max-w-xl mx-auto mt-6">
          <ChefHat className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">All Clear! No Active Orders</h3>
          <p className="text-xs text-slate-500 mt-1">
            Excellent! The order queue is completely clear. Grab a cup of chai.
          </p>
        </div>
      ) : (
        /* Orders Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeOrders.map((order) => {
            const minutesElapsed = Math.floor((Date.now() - order.timestamp) / 60000);
            
            return (
              <div 
                key={order.id} 
                className={`bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition ${getStatusColor(order.status)}`}
              >
                {/* Header */}
                <div className="p-4 bg-slate-800/80 border-b border-slate-700/60 flex justify-between items-start">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Table</span>
                    <span className="text-2xl font-black text-white">#{order.tableId}</span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusTagClass(order.status)}`}>
                      {order.status === "New" ? "NEW ORDER" : order.status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-end gap-1 font-mono">
                      <Clock size={10} />
                      <span>{minutesElapsed}m ago</span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="p-4 flex-1 space-y-4">
                  <div className="space-y-2.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="border-b border-slate-700/40 last:border-0 pb-2.5 last:pb-0">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-start gap-2">
                            <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${item.isVeg ? "bg-green-500" : "bg-red-500"}`}></span>
                            <div>
                              <span className="text-xl font-black text-slate-100 mr-2">{item.quantity}x</span>
                              <span className="font-bold text-slate-100">{item.name}</span>
                            </div>
                          </div>
                        </div>

                        {item.selectedCustomizations.length > 0 && (
                          <div className="ml-6 mt-1 flex flex-wrap gap-1.5">
                            {item.selectedCustomizations.map((c, i) => (
                              <span key={i} className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 bg-slate-750 text-slate-300 rounded border border-slate-700">
                                {c.groupName}: {c.optionName}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.notes && (
                          <p className="ml-6 mt-1 text-xs text-amber-300 italic flex items-center gap-1 bg-amber-950/40 p-1.5 rounded border border-amber-900/30">
                            <MessageSquare size={10} />
                            <span>"{item.notes}"</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.specialInstructions && (
                    <div className="p-2.5 bg-amber-950/40 text-amber-300 rounded-xl border border-amber-900/40 text-xs flex gap-1.5 items-start">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <strong className="block uppercase text-[9px] tracking-wider text-amber-400">Special Order Note:</strong>
                        <span>{order.specialInstructions}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Status Switch Action */}
                <div className="p-4 bg-slate-800/40 border-t border-slate-700/60">
                  <button
                    onClick={() => handleUpdateStatus(order.id, order.status)}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition ${
                      order.status === "New" 
                        ? "bg-amber-500 hover:bg-amber-400 text-slate-950" 
                        : order.status === "Preparing" 
                        ? "bg-blue-500 hover:bg-blue-400 text-white" 
                        : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    }`}
                  >
                    {order.status === "New" && (
                      <>
                        <Play size={14} /> Start Preparing
                      </>
                    )}
                    {order.status === "Preparing" && (
                      <>
                        <Flame size={14} className="animate-pulse" /> Mark as Ready
                      </>
                    )}
                    {order.status === "Ready" && (
                      <>
                        <Check size={14} /> Mark as Served
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
