<script setup lang="ts">
/**
 * Ops right-rail context drawer for the selected device.
 * KPI values are mocked until a telemetry API lands — see TODO(telemetry).
 */
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import type { Device } from '@dt/contracts';
import { useI18n } from '@dt/i18n';
import {
  DtEmptyState,
  DtPanel,
  DtStatCard,
  DtStatusBadge,
  DtTabs,
} from '@dt/ui-kit';

import { useDeviceStore } from '../stores/device-store.js';

const { t } = useI18n();

const deviceStore = useDeviceStore();
const { selectedDevice } = storeToRefs(deviceStore);

const activeTab = ref('overview');

watch(selectedDevice, () => {
  activeTab.value = 'overview';
});

const tabs = computed(() => [
  { id: 'overview', label: t('device.drawer.tabs.overview') },
  { id: 'runtime', label: t('device.drawer.tabs.runtime') },
  { id: 'alarms', label: t('device.drawer.tabs.alarms') },
  { id: 'maintenance', label: t('device.drawer.tabs.maintenance') },
  { id: 'docs', label: t('device.drawer.tabs.docs') },
]);

type TelemetryRow = { key: string; label: string; value: string };

function telemetryRows(device: Device): TelemetryRow[] {
  const located = device as Device & { line?: string; area?: string };
  const rows: TelemetryRow[] = [
    { key: 'id', label: t('device.drawer.telemetry.id'), value: device.id },
    { key: 'name', label: t('device.drawer.telemetry.name'), value: device.name },
    { key: 'status', label: t('device.drawer.telemetry.status'), value: device.status },
    {
      key: 'sceneNode',
      label: t('device.drawer.telemetry.sceneNode'),
      value: device.sceneNodeId,
    },
    {
      key: 'updatedAt',
      label: t('device.drawer.telemetry.updatedAt'),
      value: device.updatedAt,
    },
    {
      key: 'tenant',
      label: t('device.drawer.telemetry.tenant'),
      value: device.tenantId,
    },
  ];
  if (located.line) {
    rows.push({
      key: 'line',
      label: t('device.drawer.telemetry.line'),
      value: located.line,
    });
  }
  if (located.area) {
    rows.push({
      key: 'area',
      label: t('device.drawer.telemetry.area'),
      value: located.area,
    });
  }
  return rows;
}

const rows = computed(() =>
  selectedDevice.value ? telemetryRows(selectedDevice.value) : [],
);

// TODO(telemetry): replace mock KPIs with live metrics from the telemetry API.
const mockKpis = computed(() => {
  const status = selectedDevice.value?.status ?? 'offline';
  return [
    {
      label: t('device.drawer.kpi.uptime'),
      value: status === 'offline' ? '—' : '98.2%',
      hint: '24h',
      trend: status === 'alarm' ? ('down' as const) : ('up' as const),
      trendLabel: status === 'alarm' ? '-1.4%' : '+0.3%',
    },
    {
      label: t('device.drawer.kpi.throughput'),
      value: status === 'offline' ? '0' : '142',
      hint: 'pcs/h',
      trend: 'neutral' as const,
      trendLabel: '±0',
    },
    {
      label: t('device.drawer.kpi.temp'),
      value: status === 'offline' ? '—' : status === 'alarm' ? '78°C' : '42°C',
      hint: '°C',
      trend:
        status === 'alarm' || status === 'warning'
          ? ('up' as const)
          : ('neutral' as const),
      trendLabel: status === 'alarm' ? '+12°C' : 'stable',
    },
    {
      label: t('device.drawer.kpi.load'),
      value: status === 'offline' ? '0%' : '64%',
      hint: '%',
      trend: 'neutral' as const,
    },
  ];
});
</script>

<template>
  <aside class="device-drawer" aria-label="device detail">
    <DtEmptyState
      v-if="!selectedDevice"
      :title="t('device.drawer.emptyTitle')"
      :description="t('device.drawer.emptyDescription')"
    />
    <template v-else>
      <header class="device-drawer__header">
        <div class="device-drawer__title-block">
          <h2 class="device-drawer__title">{{ selectedDevice.name }}</h2>
          <p class="device-drawer__id">{{ selectedDevice.id }}</p>
        </div>
        <DtStatusBadge :status="selectedDevice.status" />
      </header>

      <DtTabs v-model="activeTab" :tabs="tabs">
        <template v-if="activeTab === 'overview'">
          <div class="device-drawer__kpis">
            <DtStatCard
              v-for="kpi in mockKpis"
              :key="kpi.label"
              :label="kpi.label"
              :value="kpi.value"
              :hint="kpi.hint"
              :trend="kpi.trend"
              :trend-label="kpi.trendLabel"
            />
          </div>
          <DtPanel :title="t('device.drawer.telemetry.title')" density="compact">
            <dl class="device-drawer__telemetry">
              <div
                v-for="row in rows"
                :key="row.key"
                class="device-drawer__telemetry-row"
              >
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
            </dl>
          </DtPanel>
        </template>
        <p v-else class="device-drawer__placeholder">
          {{ t('device.drawer.tabPlaceholder') }}
        </p>
      </DtTabs>
    </template>
  </aside>
</template>

<style scoped>
.device-drawer {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-xl);
  min-height: 0;
  min-width: 0;
  height: 100%;
  padding: var(--dt-space-md);
  overflow: auto;
  background: var(--dt-bg-elevated);
  border-left: 1px solid var(--dt-border-subtle);
}
.device-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dt-space-md);
}
.device-drawer__title-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.device-drawer__title {
  margin: 0;
  font-size: var(--dt-text-md);
  font-weight: var(--dt-weight-semi);
  color: var(--dt-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.device-drawer__id {
  margin: 0;
  font-family: var(--dt-font-mono);
  font-size: var(--dt-text-xs);
  color: var(--dt-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.device-drawer__kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dt-space-md);
  margin-bottom: var(--dt-space-xl);
}
.device-drawer__telemetry {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-sm);
}
.device-drawer__telemetry-row {
  display: grid;
  grid-template-columns: minmax(72px, 30%) 1fr;
  gap: var(--dt-space-md);
  align-items: baseline;
}
.device-drawer__telemetry-row dt {
  margin: 0;
  color: var(--dt-text-secondary);
  font-size: var(--dt-text-xs);
}
.device-drawer__telemetry-row dd {
  margin: 0;
  color: var(--dt-text-primary);
  font-size: var(--dt-text-sm);
  font-family: var(--dt-font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.device-drawer__placeholder {
  margin: 0;
  color: var(--dt-text-muted);
  font-size: var(--dt-text-sm);
}
</style>
