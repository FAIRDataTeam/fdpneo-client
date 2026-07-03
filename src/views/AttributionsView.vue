<script setup lang="ts">
/**
 * About & attributions page.
 *
 * A public (no-auth) page that names the client/server build and lists the
 * third-party data sources whose licenses require visible credit. The DB-IP
 * entry is a CC BY 4.0 obligation, not courtesy: the server derives the
 * geographic metrics from DB-IP's IP-to-City Lite database (server ADR-0002),
 * and the credit is also shown inline on the metrics dashboard's geo panel.
 * This page is the canonical, persistent home for that and any future
 * attribution.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAppInfo } from "@/composables/useAppInfo";

const { t } = useI18n();
const { data: info } = useAppInfo();

const clientVersion = __APP_VERSION__;
const serverLabel = computed(() =>
  info.value ? `${info.value.name} · v${info.value.version}` : null,
);

interface Attribution {
  name: string;
  url: string;
  license: string;
  licenseUrl: string;
  /** What the data is used for, in plain terms. */
  use: string;
}

// Third-party data sources whose licenses require visible attribution.
const dataSources = computed<Attribution[]>(() => [
  {
    name: "DB-IP IP-to-City Lite",
    url: "https://db-ip.com",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    use: t("attributions.dbipUse"),
  },
]);
</script>

<template>
  <section class="page">
    <header class="head">
      <div class="eyebrow mono">{{ t("attributions.eyebrow") }}</div>
      <h1>{{ t("attributions.heading") }}</h1>
      <p class="lede">
        {{ t("attributions.lede") }}
      </p>
    </header>

    <section class="block">
      <h2 class="block__title">{{ t("attributions.thisClient") }}</h2>
      <dl class="facts">
        <div class="fact">
          <dt>{{ t("attributions.client") }}</dt>
          <dd class="mono">v{{ clientVersion }}</dd>
        </div>
        <div class="fact">
          <dt>{{ t("attributions.server") }}</dt>
          <dd class="mono">
            <template v-if="serverLabel">{{ serverLabel }}</template>
            <span v-else class="muted">{{ t("attributions.unavailable") }}</span>
          </dd>
        </div>
      </dl>
      <p class="copyright">© FAIR Data Team — Apache-2.0.</p>
    </section>

    <section class="block">
      <h2 class="block__title">{{ t("attributions.dataSources") }}</h2>
      <p class="block__lede">
        {{ t("attributions.dataSourcesLede") }}
      </p>
      <ul class="sources">
        <li v-for="s in dataSources" :key="s.name" class="source">
          <div class="source__head">
            <a :href="s.url" target="_blank" rel="noopener noreferrer" class="source__name">{{
              s.name
            }}</a>
            <a
              :href="s.licenseUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="source__license"
              >{{ s.license }}</a
            >
          </div>
          <p class="source__use">{{ s.use }}</p>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 64px 48px;
  max-width: 820px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 28px;
  background: var(--fair-bg);
}
.eyebrow {
  font-size: 11px;
  color: var(--fair-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
h1 {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 32px;
  color: var(--fair-text-strong);
}
.lede {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--fair-text);
  max-width: 620px;
}
.block {
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
  padding: 20px 22px;
}
.block__title {
  margin: 0 0 14px;
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 13px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fair-text-muted);
}
.block__lede {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fair-text);
}
.facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fact {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid var(--fair-separator);
  padding-top: 8px;
}
.fact dt {
  font-family: var(--fair-font-sans);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fair-text-muted);
}
.fact dd {
  margin: 0;
  font-size: 13px;
  color: var(--fair-text-strong);
  text-align: right;
}
.copyright {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--fair-text-muted);
}
.sources {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.source {
  border-top: 1px solid var(--fair-separator);
  padding-top: 12px;
}
.source:first-child {
  border-top: 0;
  padding-top: 0;
}
.source__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.source__name {
  font-family: var(--fair-font-sans);
  font-size: 15px;
  font-weight: 500;
  color: var(--tool-accent);
  text-decoration: underline;
}
.source__license {
  font-family: var(--fair-font-sans);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fair-text);
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-sm);
  padding: 2px 7px;
  text-decoration: none;
}
.source__use {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fair-text);
}
.muted {
  color: var(--fair-text-muted);
}
@media (max-width: 720px) {
  .page {
    padding: 28px 20px 40px;
  }
}
</style>
