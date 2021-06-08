<template>
      <q-markup-table flat>
        <thead>
            <tr>
                <th scope="col"></th>
                <th scope="col">Portfolio</th>
                <th scope="col">Benchmark</th>
            </tr>
        </thead>
        <tbody>
        <tr v-for="(metric, index) in metricNames" :key="index">
            <td>
                <span class="font-weight-bold">{{ metrics[metric].name }}</span>
            </td>
            <td>
                <span v-if="metrics[metric].prefix">{{ metrics[metric].prefix }}</span>
                <span>{{ metrics[metric].portfolioValue }}</span>
                <span v-if="metrics[metric].portfolioSuffix">{{ metrics[metric].portfolioSuffix }}</span>
            </td>
            <td>
                <span v-if="metrics[metric].prefix">{{ metrics[metric].prefix }}</span>
                <span>{{ metrics[metric].benchmarkValue }}</span>
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
      metricNames: ["finalBalance", "totalDeposited", "totalWithdrawn", "stdDev", "bestYear", "worstYear", "sharpeRatio", "sortinoRatio"]
    }
  }
}
</script>
