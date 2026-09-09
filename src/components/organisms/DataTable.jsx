import { twMerge } from 'tailwind-merge'

const DataTable = ({ columns, data, className }) => {
  return (
    <div className={twMerge('overflow-x-auto rounded-lg border border-slate-200 bg-white', className)}>
      <table className="w-full min-w-[680px] text-left text-sm sm:min-w-[800px]">
        <thead className="bg-slate-50 text-slate-700 font-medium">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="border-b border-slate-200 px-3 py-2.5 sm:px-6 sm:py-3">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-3 py-3 text-slate-600 sm:px-6 sm:py-4">
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
