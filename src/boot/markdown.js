import { useQMarkdownGlobalProps } from '@quasar/quasar-ui-qmarkdown'
import katex from '@iktakahiro/markdown-it-katex'

console.log(katex);

// defaults for QMarkdown
useQMarkdownGlobalProps({
  plugins: [katex]
})
