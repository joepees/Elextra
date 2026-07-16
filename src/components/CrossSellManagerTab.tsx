import React, { useState, useEffect } from "react";
import { DB } from "../db";
import { 
  Search, Plus, Trash2, Edit2, RotateCcw, Check, X, Tag, 
  ShoppingBag, Utensils, Sparkles, HelpCircle, Save
} from "lucide-react";

interface SuggestedItem {
  id: string;
  name: string;
  price: number;
  img: string; // Emoji or short code
  cat?: string;
}

interface CrossSellRule {
  id: string;
  targetId: string;
  targetName: string;
  category: "food" | "grocery" | "general" | "specific_item";
  suggestions: SuggestedItem[];
}

interface CrossSellManagerTabProps {
  user: any;
  notify: (msg: string, type?: "ok" | "err") => void;
  syncDBKey: (key: string, data: any) => Promise<void>;
}

export default function CrossSellManagerTab({
  user,
  notify,
  syncDBKey
}: CrossSellManagerTabProps) {
  const [rules, setRules] = useState<CrossSellRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Form states for adding/editing a recommended item in the selected rule
  const [newSugName, setNewSugName] = useState("");
  const [newSugPrice, setNewSugPrice] = useState("");
  const [newSugImg, setNewSugImg] = useState("🥤");
  const [newSugCat, setNewSugCat] = useState("Extras");

  // Form states for creating a new custom recommendation rule
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [newRuleTargetId, setNewRuleTargetId] = useState("");
  const [newRuleTargetName, setNewRuleTargetName] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState<"specific_item" | "food" | "grocery" | "general">("specific_item");

  // Load and seed rules from DB on mount
  useEffect(() => {
    const fetchRules = async () => {
      const val = await DB.get("elx_cross_sell_rules");
      if (val && Array.isArray(val) && val.length > 0) {
        setRules(val);
        setSelectedRuleId(val[0]?.id || "");
      } else {
        const defaults: CrossSellRule[] = [
          {
            id: "rule-1",
            targetId: "waakye",
            targetName: "Special Waakye plate",
            category: "specific_item",
            suggestions: [
              { id: "cs-w1", name: "Shito Pepper Sauce", price: 4.0, img: "🌶️", cat: "Extras" },
              { id: "cs-w2", name: "Extra Boiled Egg", price: 3.0, img: "🥚", cat: "Extras" },
              { id: "cs-w3", name: "Avocado Pear Slice", price: 5.0, img: "🥑", cat: "Extras" },
              { id: "cs-w4", name: "Fried Fish Addon", price: 8.0, img: "🐟", cat: "Extras" }
            ]
          },
          {
            id: "rule-2",
            targetId: "plain_rice",
            targetName: "Plain Rice plate",
            category: "specific_item",
            suggestions: [
              { id: "cs-r1", name: "Fried Chicken Drumstick", price: 12.0, img: "🍗", cat: "Extras" },
              { id: "cs-r2", name: "Zesty Coleslaw", price: 5.0, img: "🥗", cat: "Extras" },
              { id: "cs-r3", name: "Spaghetti Addon", price: 4.0, img: "🍝", cat: "Extras" }
            ]
          },
          {
            id: "rule-3",
            targetId: "jollof_rice",
            targetName: "Spiced Jollof Rice plate",
            category: "specific_item",
            suggestions: [
              { id: "cs-j1", name: "Grilled Chicken Quarter", price: 15.0, img: "🍗", cat: "Extras" },
              { id: "cs-j2", name: "Coleslaw Portion", price: 5.0, img: "🥗", cat: "Extras" },
              { id: "cs-j3", name: "Boiled Egg", price: 3.0, img: "🥚", cat: "Extras" }
            ]
          },
          {
            id: "rule-4",
            targetId: "food",
            targetName: "General Food Category",
            category: "food",
            suggestions: [
              { id: "sug-1", name: "Coca-Cola Original 450ml", price: 8.5, img: "🥤", cat: "Grocery" },
              { id: "sug-2", name: "Red Bull Energy Drink", price: 22.0, img: "⚡", cat: "Grocery" },
              { id: "sug-3", name: "Bel-Aqua Mineral Water", price: 2.6, img: "💧", cat: "Grocery" }
            ]
          },
          {
            id: "rule-5",
            targetId: "grocery",
            targetName: "General Grocery Category",
            category: "grocery",
            suggestions: [
              { id: "sug-4", name: "Chaddas Chips Classic", price: 19.9, img: "🍟", cat: "Grocery" },
              { id: "sug-6", name: "India Gate Rozana Rice", price: 139.0, img: "🌾", cat: "Grocery" },
              { id: "cs-g1", name: "Detol Hygiene Liquid", price: 24.0, img: "🧼", cat: "Grocery" }
            ]
          }
        ];
        setRules(defaults);
        setSelectedRuleId(defaults[0].id);
        await DB.set("elx_cross_sell_rules", defaults);
      }
    };
    fetchRules();
  }, []);

  const selectedRule = rules.find(r => r.id === selectedRuleId);

  // Save rules globally
  const handleSaveChanges = async (updatedRules = rules) => {
    setIsSaving(true);
    try {
      await syncDBKey("elx_cross_sell_rules", updatedRules);
      setRules(updatedRules);
      notify("Cross-Sell and 'People Also Add' recommendations updated successfully!", "ok");
    } catch (e) {
      notify("Failed to save recommendations changes", "err");
    } finally {
      setIsSaving(false);
    }
  };

  // Add suggestion item to current rule
  const handleAddSuggestion = () => {
    if (!selectedRuleId) return;
    if (!newSugName.trim()) {
      notify("Please provide a name for the suggestion item", "err");
      return;
    }
    const priceNum = parseFloat(newSugPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      notify("Please provide a valid price (e.g., 5.00)", "err");
      return;
    }

    const newItem: SuggestedItem = {
      id: "cs-item-" + Math.random().toString(36).substring(2, 9),
      name: newSugName.trim(),
      price: priceNum,
      img: newSugImg.trim(),
      cat: newSugCat.trim()
    };

    const updatedRules = rules.map(r => {
      if (r.id === selectedRuleId) {
        return {
          ...r,
          suggestions: [...(r.suggestions || []), newItem]
        };
      }
      return r;
    });

    setNewSugName("");
    setNewSugPrice("");
    setNewSugImg("🥤");
    setNewSugCat("Extras");
    handleSaveChanges(updatedRules);
  };

  // Remove a suggested item
  const handleRemoveSuggestion = (itemId: string) => {
    if (!selectedRuleId) return;
    const updatedRules = rules.map(r => {
      if (r.id === selectedRuleId) {
        return {
          ...r,
          suggestions: (r.suggestions || []).filter(item => item.id !== itemId)
        };
      }
      return r;
    });
    handleSaveChanges(updatedRules);
  };

  // Create a brand new rule
  const handleCreateRule = () => {
    if (!newRuleTargetId.trim()) {
      notify("Please enter a target ID (e.g. food, grocery, or a specific item id like waakye)", "err");
      return;
    }
    if (!newRuleTargetName.trim()) {
      notify("Please enter a target Display Name", "err");
      return;
    }

    const newRule: CrossSellRule = {
      id: "rule-" + Math.random().toString(36).substring(2, 9),
      targetId: newRuleTargetId.trim().toLowerCase(),
      targetName: newRuleTargetName.trim(),
      category: newRuleCategory,
      suggestions: []
    };

    const updated = [...rules, newRule];
    setRules(updated);
    setSelectedRuleId(newRule.id);
    setNewRuleTargetId("");
    setNewRuleTargetName("");
    setNewRuleCategory("specific_item");
    setIsCreatingRule(false);
    handleSaveChanges(updated);
  };

  // Delete an entire rule
  const handleDeleteRule = (ruleId: string) => {
    if (confirm("Are you sure you want to delete this recommendation rule?")) {
      const updated = rules.filter(r => r.id !== ruleId);
      setRules(updated);
      if (selectedRuleId === ruleId) {
        setSelectedRuleId(updated[0]?.id || "");
      }
      handleSaveChanges(updated);
    }
  };

  // Reset to default preset
  const handleResetToPresets = () => {
    if (confirm("Are you sure you want to reset all recommendations to default system presets? This will overwrite your custom rules!")) {
      const defaults: CrossSellRule[] = [
        {
          id: "rule-1",
          targetId: "waakye",
          targetName: "Special Waakye plate",
          category: "specific_item",
          suggestions: [
            { id: "cs-w1", name: "Shito Pepper Sauce", price: 4.0, img: "🌶️", cat: "Extras" },
            { id: "cs-w2", name: "Extra Boiled Egg", price: 3.0, img: "🥚", cat: "Extras" },
            { id: "cs-w3", name: "Avocado Pear Slice", price: 5.0, img: "🥑", cat: "Extras" },
            { id: "cs-w4", name: "Fried Fish Addon", price: 8.0, img: "🐟", cat: "Extras" }
          ]
        },
        {
          id: "rule-2",
          targetId: "plain_rice",
          targetName: "Plain Rice plate",
          category: "specific_item",
          suggestions: [
            { id: "cs-r1", name: "Fried Chicken Drumstick", price: 12.0, img: "🍗", cat: "Extras" },
            { id: "cs-r2", name: "Zesty Coleslaw", price: 5.0, img: "🥗", cat: "Extras" },
            { id: "cs-r3", name: "Spaghetti Addon", price: 4.0, img: "🍝", cat: "Extras" }
          ]
        },
        {
          id: "rule-3",
          targetId: "jollof_rice",
          targetName: "Spiced Jollof Rice plate",
          category: "specific_item",
          suggestions: [
            { id: "cs-j1", name: "Grilled Chicken Quarter", price: 15.0, img: "🍗", cat: "Extras" },
            { id: "cs-j2", name: "Coleslaw Portion", price: 5.0, img: "🥗", cat: "Extras" },
            { id: "cs-j3", name: "Boiled Egg", price: 3.0, img: "🥚", cat: "Extras" }
          ]
        },
        {
          id: "rule-4",
          targetId: "food",
          targetName: "General Food Category",
          category: "food",
          suggestions: [
            { id: "sug-1", name: "Coca-Cola Original 450ml", price: 8.5, img: "🥤", cat: "Grocery" },
            { id: "sug-2", name: "Red Bull Energy Drink", price: 22.0, img: "⚡", cat: "Grocery" },
            { id: "sug-3", name: "Bel-Aqua Mineral Water", price: 2.6, img: "💧", cat: "Grocery" }
          ]
        },
        {
          id: "rule-5",
          targetId: "grocery",
          targetName: "General Grocery Category",
          category: "grocery",
          suggestions: [
            { id: "sug-4", name: "Chaddas Chips Classic", price: 19.9, img: "🍟", cat: "Grocery" },
            { id: "sug-6", name: "India Gate Rozana Rice", price: 139.0, img: "🌾", cat: "Grocery" },
            { id: "cs-g1", name: "Detol Hygiene Liquid", price: 24.0, img: "🧼", cat: "Grocery" }
          ]
        }
      ];
      setSelectedRuleId(defaults[0].id);
      handleSaveChanges(defaults);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6" id="cross_sell_manager_panel">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl mb-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Sparkles className="text-amber-400 w-5 h-5 animate-pulse" />
              "What People Also Add" Cross-Sell Configurator
            </h1>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">
              Dynamically customize up-sell item carousels at checkout. Configure item-specific recommendations 
              (e.g., adding Shito, Egg, or Avocado to a specific Waakye plate) or general categories like Food/Groceries.
            </p>
          </div>
          <button
            onClick={handleResetToPresets}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 rounded-lg text-xs font-bold transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Presets
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rules List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">Recommendation Rules</h2>
            <button
              onClick={() => setIsCreatingRule(!isCreatingRule)}
              className="flex items-center gap-1 px-2 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-[11px] font-black transition active:scale-95"
            >
              <Plus className="w-3 h-3" />
              Add Trigger Rule
            </button>
          </div>

          {/* Create Rule Panel */}
          {isCreatingRule && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 animate-fadeIn">
              <h3 className="text-xs font-bold text-slate-700">New Trigger Condition</h3>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Target Match ID</label>
                <input
                  type="text"
                  placeholder="e.g. waakye, pizza, electronics"
                  value={newRuleTargetId}
                  onChange={(e) => setNewRuleTargetId(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none"
                />
                <span className="text-[9px] text-slate-400 mt-1 block">
                  Match ID matches the item ID or category code in the database.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Display Target Name</label>
                <input
                  type="text"
                  placeholder="e.g. Special Waakye dish recommendations"
                  value={newRuleTargetName}
                  onChange={(e) => setNewRuleTargetName(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Rule Class/Scope</label>
                <select
                  value={newRuleCategory}
                  onChange={(e: any) => setNewRuleCategory(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer"
                >
                  <option value="specific_item">Specific Item ID Match 🛒</option>
                  <option value="food">General Food Category 🍔</option>
                  <option value="grocery">General Grocery Category 🥬</option>
                  <option value="general">Global Fallback 🌍</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  onClick={() => setIsCreatingRule(false)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-bold transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRule}
                  className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-xs font-bold transition active:scale-95"
                >
                  Create Trigger Rule
                </button>
              </div>
            </div>
          )}

          {/* List of active rules */}
          <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto">
            {rules.map((r) => {
              const isSelected = r.id === selectedRuleId;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRuleId(r.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected 
                      ? "bg-teal-50 border-teal-500 shadow-sm" 
                      : "bg-white border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg text-lg ${isSelected ? "bg-teal-100" : "bg-slate-100"}`}>
                      {r.category === "food" ? "🍔" : r.category === "grocery" ? "🥬" : r.category === "general" ? "🌍" : "🎯"}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{r.targetName}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9.5px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                          ID: {r.targetId}
                        </span>
                        <span className="text-[9.5px] text-slate-400">•</span>
                        <span className="text-[9.5px] text-slate-500 font-bold">
                          {r.suggestions?.length || 0} items recommended
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRule(r.id);
                    }}
                    className="p-1 text-slate-300 hover:text-red-500 rounded transition"
                    title="Delete trigger rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            
            {rules.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No custom cross-sell recommendations configured yet. Click "Add Trigger Rule" above to begin.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Rule Editor & Suggestions list */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {selectedRule ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-5">
              {/* Header */}
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-teal-600 uppercase tracking-widest">Active Configurator</span>
                  <span className="text-xs text-slate-400">/</span>
                  <span className="text-xs text-slate-500 font-bold font-mono">ID: {selectedRule.targetId}</span>
                </div>
                <h2 className="text-base font-black text-slate-800 mt-1">{selectedRule.targetName}</h2>
              </div>

              {/* Suggestions list */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                  Currently Recommended Items ({selectedRule.suggestions?.length || 0})
                </h3>
                
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {(selectedRule.suggestions || []).map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl bg-white w-9 h-9 rounded-lg flex items-center justify-center border border-slate-100">
                          {item.img}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {item.cat || "Addon / Extras"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-xs font-black text-slate-800">
                          ₵{item.price.toFixed(2)}
                        </div>
                        <button
                          onClick={() => handleRemoveSuggestion(item.id)}
                          className="p-1 text-slate-300 hover:text-red-500 rounded transition"
                          title="Remove recommendation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(selectedRule.suggestions || []).length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      No items recommended for this trigger yet. Use the form below to add complementary items!
                    </div>
                  )}
                </div>
              </div>

              {/* Form to add suggestion */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-teal-600" />
                  Add New Recommended Item
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Item Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Zesty Coleslaw Portion"
                      value={newSugName}
                      onChange={(e) => setNewSugName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Suggested Price (₵)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5.00"
                      value={newSugPrice}
                      onChange={(e) => setNewSugPrice(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Item Emoji/Icon</label>
                    <input
                      type="text"
                      placeholder="e.g. 🥗"
                      value={newSugImg}
                      onChange={(e) => setNewSugImg(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Category Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Extras, Drinks, Spices"
                      value={newSugCat}
                      onChange={(e) => setNewSugCat(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleAddSuggestion}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Insert Recommended Item
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-sm flex flex-col items-center justify-center gap-2">
              <HelpCircle className="w-8 h-8 text-slate-300" />
              Please select a trigger rule from the left panel to configure its up-sell items.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
