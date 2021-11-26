<template>
  <q-markup-table flat>
    <thead>
      <tr>
        <th></th>
        <th class="text-left">Portfolio</th>
        <th class="text-left">Benchmark</th>
      </tr>
    </thead>
    <tbody>
    <tr v-for="(metric, index) in metricNames" :key="index">
      <td>
        <span class="font-weight-bold">{{ metrics[metric].name }}</span>
      </td>
      <td>
        <span v-if="metrics[metric].prefix">{{ metrics[metric].prefix }}</span>
        <span>{{ metrics[metric].portfolioFormattedValue }}</span>
        <span v-if="metrics[metric].portfolioSuffix">{{ metrics[metric].portfolioSuffix }}</span>
      </td>
      <td>
        <span v-if="metrics[metric].prefix">{{ metrics[metric].prefix }}</span>
        <span>{{ metrics[metric].benchmarkFormattedValue }}</span>
        <span v-if="metrics[metric].benchmarkSuffix">{{ metrics[metric].benchmarkSuffix }}</span>
      </td>
    </tr>
    </tbody>
  </q-markup-table>
</template>

<script>
export default {
  name: 'PortfolioMetrics',
  props: {
    metrics: Object
  },
  data() {
    return {
      metricNames: ["finalBalance", "bestYear", "worstYear", "sharpeRatio", "sortinoRatio", "stdDev", "ulcerIndex"]
    }
  }
}
</script>
