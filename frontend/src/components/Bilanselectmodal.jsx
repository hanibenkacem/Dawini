import { useEffect, useState } from "react";
import { BILAN_CATEGORIES, BILAN_PRESETS, normalizeBilanTests } from "../config/bilanTests";

/**
 * Sélecteur d'examens pour un bilan biologique.
 *
 * Props:
 *  - show      : boolean
 *  - onClose   : () => void
 *  - onConfirm : ({ tests: string[], autres: string }) => void
 *  - initial   : { tests?: string[], autres?: string } — valeurs de départ à chaque ouverture
 */
const BilanSelectModal = ({ show, onClose, onConfirm, initial }) => {
  const [selected, setSelected] = useState(() => new Set());
  const [autres, setAutres] = useState("");

  // Réinitialise la sélection à chaque ouverture.
  useEffect(() => {
    if (show) {
      setSelected(new Set(initial?.tests || []));
      setAutres(initial?.autres || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applyPreset = (ids) => setSelected((prev) => new Set([...prev, ...ids]));
  const clearAll = () => setSelected(new Set());

  const count = selected.size;
  const canConfirm = count > 0 || autres.trim().length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({ tests: normalizeBilanTests([...selected]), autres: autres.trim() });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Bilan biologique</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {count === 0 ? "Aucun examen sélectionné" : `${count} examen${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            ✕ Fermer
          </button>
        </div>

        {/* Presets */}
        <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 mr-1">Raccourcis :</span>
          {BILAN_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.tests)}
              className="text-xs px-3 py-1.5 rounded-full border border-blue-200 bg-white text-blue-700 font-medium hover:bg-blue-50 transition"
            >
              + {p.label}
            </button>
          ))}
          {count > 0 && (
            <button
              onClick={clearAll}
              className="text-xs px-3 py-1.5 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition ml-auto"
            >
              Tout décocher
            </button>
          )}
        </div>

        {/* Tests */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {BILAN_CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <h3 className="text-sm font-bold text-gray-700 mb-2">{cat.label}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cat.tests.map((t) => {
                  const checked = selected.has(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition select-none ${
                        checked
                          ? "border-blue-500 bg-blue-50 text-blue-800 font-medium"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(t.id)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      {t.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">Autres</h3>
            <textarea
              value={autres}
              onChange={(e) => setAutres(e.target.value)}
              rows={3}
              placeholder="Autres examens à demander (un par ligne)…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-white">
          <button
            onClick={onClose}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Aperçu du bilan
          </button>
        </div>
      </div>
    </div>
  );
};

export default BilanSelectModal;