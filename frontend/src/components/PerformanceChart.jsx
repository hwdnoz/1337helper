import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function PerformanceChart({ metrics }) {
  const prepareChartData = () => {
    return metrics
      .slice()
      .reverse()
      .map((metric, index) => ({
        name: new Date(metric.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latency: (metric.latency_ms / 1000).toFixed(2),
        tokensSent: metric.tokens_sent,
        tokensReceived: metric.tokens_received,
        totalTokens: metric.total_tokens,
        cacheHit: metric.metadata?.cache_hit ? 1 : 0,
      }))
  }

  if (metrics.length === 0) return null

  return (
    <div className="admin-section">
      <h2>LLM API Performance Over Time</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={prepareChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
          <XAxis
            dataKey="name"
            stroke="#888"
            style={{ fontSize: '0.8rem' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#888"
            style={{ fontSize: '0.8rem' }}
            label={{ value: 'Latency (s)', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#888"
            style={{ fontSize: '0.8rem' }}
            label={{ value: 'Tokens', angle: 90, position: 'insideRight', style: { fill: '#888' } }}
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
            yAxisId="left"
            type="monotone"
            dataKey="latency"
            stroke="#f44336"
            name="Latency (s)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="tokensSent"
            stroke="#4caf50"
            name="Tokens Sent"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="tokensReceived"
            stroke="#2196f3"
            name="Tokens Received"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PerformanceChart
