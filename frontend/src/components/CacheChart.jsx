import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function CacheChart({ metrics }) {
  const prepareCacheChartData = () => {
    return metrics
      .slice()
      .reverse()
      .map((metric) => ({
        name: new Date(metric.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cacheHits: metric.metadata?.cache_hit ? 1 : 0,
        cacheMisses: metric.metadata?.cache_hit === false ? 1 : 0,
        leetcode_hit: metric.operation_type === 'leetcode_solve' && metric.metadata?.cache_hit ? 1 : 0,
        leetcode_miss: metric.operation_type === 'leetcode_solve' && metric.metadata?.cache_hit === false ? 1 : 0,
        testcase_hit: metric.operation_type === 'test_case_generation' && metric.metadata?.cache_hit ? 1 : 0,
        testcase_miss: metric.operation_type === 'test_case_generation' && metric.metadata?.cache_hit === false ? 1 : 0,
        codemod_hit: metric.operation_type === 'code_modification' && metric.metadata?.cache_hit ? 1 : 0,
        codemod_miss: metric.operation_type === 'code_modification' && metric.metadata?.cache_hit === false ? 1 : 0,
      }))
  }

  if (metrics.length === 0) return null

  return (
    <div className="admin-section">
      <h2>Cache Performance Over Time</h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={prepareCacheChartData()} margin={{ top: 5, right: 90, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
          <XAxis
            dataKey="name"
            stroke="#888"
            style={{ fontSize: '0.8rem' }}
          />
          <YAxis
            stroke="#888"
            style={{ fontSize: '0.8rem' }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#252526',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              color: '#d4d4d4'
            }}
          />
          <Legend
            wrapperStyle={{ color: '#d4d4d4' }}
          />
          <Line
            type="monotone"
            dataKey="leetcode_hit"
            stroke="#9c27b0"
            name="LeetCode Hits"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="leetcode_miss"
            stroke="#ce93d8"
            name="LeetCode Misses"
            strokeWidth={2}
            dot={{ r: 4 }}
            strokeDasharray="5 5"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="testcase_hit"
            stroke="#ff9800"
            name="Test Case Hits"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="testcase_miss"
            stroke="#ffcc80"
            name="Test Case Misses"
            strokeWidth={2}
            dot={{ r: 4 }}
            strokeDasharray="5 5"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="codemod_hit"
            stroke="#00bcd4"
            name="Code Mod Hits"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="codemod_miss"
            stroke="#80deea"
            name="Code Mod Misses"
            strokeWidth={2}
            dot={{ r: 4 }}
            strokeDasharray="5 5"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CacheChart
