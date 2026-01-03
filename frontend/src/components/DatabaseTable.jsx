import { useState } from 'react'
import '../App.css'

/**
 * Reusable database table component with sorting, filtering, and pagination
 *
 * @param {Array} data - Array of data objects to display
 * @param {Array} columns - Column definitions: [{ key, label, render?, sortable?, filterable? }]
 * @param {Boolean} loading - Loading state
 * @param {Function} onRefresh - Callback for refresh button
 * @param {String} emptyMessage - Message to show when no data
 */
function DatabaseTable({
  data = [],
  columns = [],
  loading = false,
  onRefresh,
  emptyMessage = 'No data available'
}) {
  const [sortColumn, setSortColumn] = useState(columns[0]?.key || 'id')
  const [sortDirection, setSortDirection] = useState('desc')
  const [filters, setFilters] = useState({})
  const [expandedCells, setExpandedCells] = useState(false)

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleFilterChange = (column, value) => {
    setFilters({ ...filters, [column]: value })
  }

  const getCellValue = (row, column) => {
    if (column.getValue) {
      return column.getValue(row)
    }
    return row[column.key]
  }

  const filteredAndSortedData = () => {
    let filtered = [...data]

    // Apply filters
    Object.keys(filters).forEach(columnKey => {
      const filterValue = filters[columnKey]?.toLowerCase()
      if (filterValue) {
        const column = columns.find(c => c.key === columnKey)
        filtered = filtered.filter(row => {
          const cellValue = String(getCellValue(row, column) || '')
          return cellValue.toLowerCase().includes(filterValue)
        })
      }
    })

    // Apply sorting
    const column = columns.find(c => c.key === sortColumn)
    filtered.sort((a, b) => {
      let aVal = getCellValue(a, column)
      let bVal = getCellValue(b, column)

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }

  const renderCell = (row, column) => {
    if (column.render) {
      return column.render(row, expandedCells)
    }
    const value = getCellValue(row, column)

    // Apply expanded/preview styling for long text
    if (column.longText) {
      return <td className={expandedCells ? 'expanded-cell' : 'preview-cell'}>{value}</td>
    }

    return <td>{value}</td>
  }

  const sortedData = filteredAndSortedData()

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setExpandedCells(!expandedCells)}
          style={{ background: expandedCells ? '#0e639c' : '#555' }}
        >
          {expandedCells ? 'Collapse Cells' : 'Expand Cells'}
        </button>
        {onRefresh && <button onClick={onRefresh}>Refresh</button>}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                    className={col.sortable !== false ? 'sortable' : ''}
                  >
                    {col.label} {sortColumn === col.key && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
              </tr>
              <tr className="filter-row">
                {columns.map(col => (
                  <th key={col.key}>
                    {col.filterable !== false && (
                      <input
                        type="text"
                        placeholder="Filter..."
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, idx) => (
                <tr key={row.id || idx}>
                  {columns.map(col => (
                    <React.Fragment key={col.key}>
                      {renderCell(row, col)}
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {sortedData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
              {data.length === 0 ? emptyMessage : 'No results match your filters'}
            </div>
          )}

          {data.length > 0 && (
            <div style={{ marginTop: '1rem', color: '#888', fontSize: '0.9rem' }}>
              Showing {sortedData.length} of {data.length} rows
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default DatabaseTable
