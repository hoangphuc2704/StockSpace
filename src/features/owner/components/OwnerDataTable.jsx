import { twMerge } from 'tailwind-merge'

const OwnerDataTable = ({ columns, data, compact = false, className, isLoading = false }) => {
  const styles = compact
    ? {
        table: 'w-full min-w-[620px] text-left text-xs sm:min-w-[760px]',
        head: 'border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold tracking-wider text-slate-600 uppercase',
        cell: 'px-3 py-2 sm:px-4 sm:py-2.5',
        body: 'divide-y divide-slate-100',
        row: 'transition-colors hover:bg-slate-50/60',
        dataCell: 'px-3 py-2.5 text-slate-600 sm:px-4 sm:py-3',
      }
    : {
        table: 'w-full min-w-[680px] text-left text-sm sm:min-w-[900px]',
        head: 'border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-[0.08em] text-slate-600 uppercase',
        cell: 'px-3 py-2.5 sm:px-5 sm:py-3',
        body: 'divide-y divide-slate-200',
        row: 'transition-colors hover:bg-slate-50',
        dataCell: 'px-3 py-3 align-middle text-slate-600 sm:px-5 sm:py-3.5',
      }

  return (
    <div className={twMerge('overflow-x-auto', className)}>
      <table className={styles.table}>
        <thead className={styles.head}>
          <tr>
            {columns.map((column, index) => (
              <th key={index} className={twMerge(styles.cell, column.headerClassName)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.body}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, rowIndex) => (
                <tr key={rowIndex} className={styles.row} aria-hidden="true">
                  {columns.map((column, columnIndex) => (
                    <td key={columnIndex} className={twMerge(styles.dataCell, column.cellClassName)}>
                      <span className="block h-4 animate-pulse rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((row, rowIndex) => (
                <tr key={rowIndex} className={styles.row}>
                  {columns.map((column, columnIndex) => (
                    <td key={columnIndex} className={twMerge(styles.dataCell, column.cellClassName)}>
                      {column.render ? column.render(row) : row[column.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}

export default OwnerDataTable
