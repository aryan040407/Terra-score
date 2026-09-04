"use client";
import { useState } from "react";
import { BrainCircuit, Database, Layers, Target, ArrowDown, CloudRain, Cpu, Gauge, Landmark, Percent, Info, ShieldAlert, Sprout } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { Card, CardSkeleton, ErrorState, Segmented, SimTag, Stat, Tag } from "@/components/ui/primitives";
import { ImportanceBars } from "@/components/charts/charts";
import { fmt, cn } from "@/lib/utils";

export default function ModelPage() {
  const { data: m, loading, error, refresh } = useApi("model", api.model, { ttl: 300_000 });
  const [imp, setImp] = useState<"gini" | "perm">("gini");
  if (loading && !m) return <div className="space-y-6"><CardSkeleton lines={2} /><div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <CardSkeleton key={i} lines={1} />)}</div><CardSkeleton lines={8} /></div>;
  if (error || !m) return <ErrorState message={error || "No model metadata"} onRetry={refresh} />;
  const fi = (imp === "gini" ? m.feature_importance : m.permutation_importance).slice(0, 14);
  const steps = [[CloudRain, "Weather + Soil + Crop + Location"], [Layers, "Data Processing & Feature Engineering"], [Cpu, `ML Prediction (${m.model_type.replace("Classifier", "")})`], [Percent, "Risk Probability"], [Gauge, "TerraScore 0–1000"], [Landmark, "Financial Decision Support"]] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <div><h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">Model Insights</h1><p className="mt-1 text-sm text-charcoal-500">Transparent view of the model behind every TerraScore. All metrics computed on a held-out test set.</p></div>
        <div className="flex gap-2"><Tag>v{m.model_version}</Tag><Tag>trained {new Date(m.trained_at).toLocaleDateString("en-IN")}</Tag><SimTag text="Trained on synthetic data" /></div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-fadeUp">
        <Stat label="Model" value={<span className="text-xl">{m.model_type.replace("Classifier", " Classifier")}</span>} sub={`${(m.hyperparameters.n_estimators as number) ?? "—"} trees · depth ${(m.hyperparameters.max_depth as number) ?? "—"}`} icon={BrainCircuit} />
        <Stat label="Training samples" value={fmt.int(m.training_samples)} sub={`${fmt.int(m.test_samples)} held-out test samples`} icon={Database} />
        <Stat label="Features" value={m.n_features} sub={`${m.grouped_feature_count} feature groups (one-hot expanded)`} icon={Layers} />
        <Stat label="ROC-AUC (test)" value={m.metrics.roc_auc.toFixed(3)} sub={`CV ${m.metrics.cv_roc_auc_mean.toFixed(3)} ± ${m.metrics.cv_roc_auc_std.toFixed(3)}`} icon={Target} tone="good" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Feature importance" subtitle={imp === "gini" ? "Model-derived feature importance (impurity-based, grouped)" : "Permutation importance on test set (ROC-AUC drop, grouped)"} action={<Segmented value={imp} onChange={setImp} options={[{ value: "gini", label: "Model-derived" }, { value: "perm", label: "Permutation" }]} />}>
          <ImportanceBars data={fi} height={420} />
        </Card>
        <div className="space-y-6">
          <Card title="Model performance" subtitle="Held-out test set · target: significant yield loss">
            <div className="grid grid-cols-2 gap-2.5">
              {[["Accuracy", m.metrics.accuracy], ["F1 score", m.metrics.f1], ["Precision", m.metrics.precision], ["Recall", m.metrics.recall], ["ROC-AUC", m.metrics.roc_auc], ["Brier score", m.metrics.brier]].map(([k, v]) => (
                <div key={k as string} className="rounded-xl border border-charcoal-100 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">{k as string}</p><p className="mt-0.5 text-xl font-semibold tabular-nums text-charcoal-900">{(v as number).toFixed(3)}</p></div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-charcoal-400">Positive class rate {fmt.pct(m.positive_rate * 100)}. Probability MAE vs latent risk {(m.metrics as unknown as { prob_mae_vs_risk_score: number }).prob_mae_vs_risk_score?.toFixed(3)}.</p>
          </Card>
          <Card title="Model comparison" subtitle="Same split, same features">
            <table className="w-full text-sm"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-charcoal-400"><th className="pb-2 font-semibold">Model</th><th className="pb-2 text-right font-semibold">AUC</th><th className="pb-2 text-right font-semibold">F1</th><th className="pb-2 text-right font-semibold">Brier</th></tr></thead>
              <tbody className="divide-y divide-charcoal-100">{m.model_comparison.map((r) => <tr key={r.model} className={cn(r.model === m.model_type && "font-semibold text-forest-800")}><td className="py-2">{r.model.replace("Classifier", "")}{r.model === m.model_type && <span className="ml-1.5 rounded bg-forest-100 px-1 py-0.5 text-[9px] uppercase text-forest-700">selected</span>}</td><td className="py-2 text-right tabular-nums">{r.roc_auc.toFixed(3)}</td><td className="py-2 text-right tabular-nums">{r.f1.toFixed(3)}</td><td className="py-2 text-right tabular-nums">{r.brier.toFixed(3)}</td></tr>)}</tbody></table>
            <p className="mt-2 text-[11px] text-charcoal-400">Random Forest is preferred when within 0.02 AUC of the best — more stable and directly explainable.</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card title="How TerraScore works" subtitle="End-to-end pipeline" icon={Sprout}>
          <ol className="space-y-1">
            {steps.map(([Icon, label], i) => (
              <li key={label} className="animate-fadeUp" style={{ animationDelay: `${i * 70}ms` }}>
                <div className={cn("flex items-center gap-3 rounded-xl border p-3", i === 4 ? "border-forest-700 bg-forest-800 text-white" : "border-charcoal-100 bg-white")}><span className={cn("rounded-lg p-1.5", i === 4 ? "bg-white/10 text-emerald-300" : "bg-forest-50 text-forest-700")}><Icon size={15} /></span><span className="text-sm font-medium">{label}</span></div>
                {i < steps.length - 1 && <div className="flex justify-center py-0.5"><ArrowDown size={14} className="text-charcoal-300" /></div>}
              </li>
            ))}
          </ol>
        </Card>
        <div className="space-y-6">
          <Card title="Scoring formula & risk bands" icon={Gauge}>
            <code className="block rounded-xl bg-charcoal-950 p-3.5 text-sm text-emerald-300">{m.score_formula}</code>
            <div className="mt-4 grid grid-cols-5 gap-1.5">{m.risk_bands.slice().reverse().map((b, i) => <div key={b.level} className="rounded-lg p-2 text-center text-white" style={{ background: ["#dc2626", "#ea580c", "#d97706", "#3e805b", "#059669"][i] }}><p className="text-[10px] font-semibold tabular-nums">{b.range}</p><p className="text-[10px] opacity-90">{b.level.replace(" Risk", "")}</p></div>)}</div>
            <ul className="mt-4 space-y-1.5 text-xs text-charcoal-600">
              <li><b>Confidence</b> = agreement across the forest&apos;s trees blended with distance from the 0.5 decision boundary.</li>
              <li><b>Local explanation</b> = global importance × direction × standardised deviation of each feature for the farm (SHAP is used automatically if installed).</li>
              <li><b>Predicted yield</b> = expected yield × (1 − 0.45 × risk probability), a documented heuristic for the demo.</li>
            </ul>
          </Card>
          <Card title="Training data & limitations" icon={Info}>
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><ShieldAlert size={14} className="mt-0.5 shrink-0" /><p><b>All training data is synthetic.</b> Labels were generated from a structural risk process with noise; the model learns that relationship. Metrics describe fit to simulated data and do <u>not</u> indicate real-world accuracy.</p></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {[["Target", m.target], ["Split", "80 / 20 stratified"], ["Training time", `${m.training_seconds}s`], ["Class weighting", String(m.hyperparameters.class_weight ?? "—")], ["Min leaf", String(m.hyperparameters.min_samples_leaf ?? "—")], ["Seed", String(m.hyperparameters.random_state ?? "—")]].map(([k, v]) => <div key={k} className="rounded-lg border border-charcoal-100 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">{k}</p><p className="mt-0.5 break-words text-charcoal-800">{v}</p></div>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
