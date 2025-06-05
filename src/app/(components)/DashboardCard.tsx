import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/(components)/ui/card"

interface DashboardCardProps {
  title: string
  children: ReactNode
}

const DashboardCard = ({ title, children }: DashboardCardProps) => {
  return (
    <Card className="h-full shadow-sm transition-all duration-200 hover:shadow-md">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-2">{children}</CardContent>
    </Card>
  )
}

export default DashboardCard
