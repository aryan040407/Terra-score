"use client";

import Link from "next/link";
import { ArrowRight, BookText, CloudRain, Cpu, Database, Gauge, Globe2, Landmark, Layers3, Leaf, ShieldCheck, Sprout, TrendingUp } from "lucide-react";
import { dataInventory, dataLineage, methodologySteps, researchSources } from "@/lib/dataSources";
import { Card, Tag } from "@/components/ui/primitives";

const sourceIcons = [CloudRain, Leaf, Landmark, Cpu];

export default function DataSourcesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">TerraScore Data & Research</h1>
          <p className="mt-1 text-sm text-charcoal-500">Understanding the data behind climate risk intelligence.</p>
        </div>
        <div className="flex gap-2">
          <Tag>Research reference</Tag>
          <Tag>Demo-safe</Tag>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card title="Data lineage" subtitle="How TerraScore turns signals into decisions" icon={Layers3}>
          <div className="space-y-3">
            {dataLineage.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 text-xs font-semibold text-forest-700">
                  {index + 1}
                </div>
                <div className="flex-1 rounded-xl border border-charcoal-100 bg-charcoal-50 px-3 py-2 text-sm font-medium text-charcoal-700">
                  {step}
                </div>
                {index < dataLineage.length - 1 && <ArrowRight size={16} className="text-charcoal-300" />}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Data provenance" subtitle="What is live, historical, derived or model-generated" icon={Database}>
          <div className="space-y-3 text-sm text-charcoal-600">
            <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3"><strong className="text-charcoal-900">Historical</strong> · Repository-generated agricultural and weather history used to establish seasonal patterns.</div>
            <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3"><strong className="text-charcoal-900">Live</strong> · Open-Meteo provides current weather inputs for scenario context and live weather cards.</div>
            <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3"><strong className="text-charcoal-900">Derived</strong> · Soil moisture, drought index, water stress and risk factors are calculated inside the ML pipeline.</div>
            <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3"><strong className="text-charcoal-900">Model output</strong> · TerraScore generation is produced by the repository Random Forest and explained on the model page.</div>
          </div>
        </Card>
      </div>

      <Card title="Dataset inventory" subtitle="What TerraScore is actually using" icon={Database}>
        <div className="space-y-4">
          {dataInventory.map((item) => (
            <div key={item.dataset} className="rounded-2xl border border-charcoal-100 bg-charcoal-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-charcoal-900">{item.dataset}</p>
                  <p className="text-sm text-charcoal-500">{item.purpose}</p>
                </div>
                <span className="rounded-full bg-forest-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-forest-700">{item.classification}</span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Fields used</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.fields.map((field) => (
                      <span key={field} className="rounded-full border border-charcoal-200 bg-white px-2 py-1 text-[10px] text-charcoal-600">{field}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Where used</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.whereUsed.map((loc) => (
                      <span key={loc} className="rounded-full border border-charcoal-200 bg-white px-2 py-1 text-[10px] text-charcoal-600">{loc}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-charcoal-100 bg-white p-3 text-sm text-charcoal-600">
                <span className="font-semibold text-charcoal-900">Source:</span> {item.source}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Research context" subtitle="Authoritative sources that help frame the agricultural and climate logic" icon={BookText}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {researchSources.map((source, index) => {
            const Icon = sourceIcons[index % sourceIcons.length];
            return (
              <div key={source.name} className="rounded-2xl border border-charcoal-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                    <Icon size={18} />
                  </div>
                  <span className="rounded-full bg-charcoal-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal-600">{source.category}</span>
                </div>

                <h3 className="mt-4 text-lg font-semibold text-charcoal-900">{source.name}</h3>
                <p className="mt-1 text-xs text-charcoal-500">{source.organization}</p>

                <div className="mt-4 space-y-2 text-sm text-charcoal-600">
                  <p><span className="font-semibold text-charcoal-900">Purpose:</span> {source.purpose}</p>
                  <p><span className="font-semibold text-charcoal-900">Relevant use:</span> {source.usage}</p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-charcoal-100 bg-charcoal-50 p-2.5 text-xs text-charcoal-600">
                  <span>{source.status}</span>
                  <Link href={source.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-forest-700 hover:underline">
                    View source <ArrowRight size={12} />
                  </Link>
                </div>

                <p className="mt-3 text-xs text-charcoal-500">{source.note}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="How TerraScore works" subtitle="Concise methodology aligned to the actual repository architecture" icon={Gauge}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {methodologySteps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-charcoal-100 bg-white p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 text-xs font-semibold text-forest-700">
                {index + 1}
              </div>
              <h3 className="text-base font-semibold text-charcoal-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-600">{step.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Data & research navigation" subtitle="Connect the research layer to the existing TerraScore experience" icon={ShieldCheck}>
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/model" className="rounded-2xl border border-charcoal-100 bg-forest-50/60 p-4 text-sm font-medium text-forest-800 hover:border-forest-200">
            Model insights →
          </Link>
          <Link href="/regions" className="rounded-2xl border border-charcoal-100 bg-forest-50/60 p-4 text-sm font-medium text-forest-800 hover:border-forest-200">
            Regional intelligence →
          </Link>
          <Link href="/simulator" className="rounded-2xl border border-charcoal-100 bg-forest-50/60 p-4 text-sm font-medium text-forest-800 hover:border-forest-200">
            Scenario analysis →
          </Link>
        </div>
      </Card>
    </div>
  );
}
