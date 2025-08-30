import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, CheckCircle2, LoaderCircle } from 'lucide-react';
import { getAllTickets } from './actions';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  noStore();
  try {
    const ticketData = await getAllTickets();
    
    let stats = {
        total: 0,
        solved: 0,
        inProgress: 0,
    };

    if (ticketData.values && ticketData.values.length > 1) {
        const headers = ticketData.values[0];
        const tickets = ticketData.values.slice(1);
        const statusIndex = headers.indexOf('Status');
        
        stats.total = tickets.length;
        
        if (statusIndex !== -1) {
            tickets.forEach(ticket => {
                const status = ticket[statusIndex];
                if (status === 'Done') stats.solved++;
                else if (status === 'In Progress') stats.inProgress++;
            });
        }
    }

    return stats;
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return { total: 0, solved: 0, inProgress: 0 };
  }
}

export default async function Home() {
  const stats = await getDashboardStats();
  
  const statsCards = [
    { title: 'Total Tickets', value: stats.total.toString(), icon: <Ticket className="h-7 w-7 text-muted-foreground" /> },
    { title: 'Tickets Solved', value: stats.solved.toString(), icon: <CheckCircle2 className="h-7 w-7 text-muted-foreground" /> },
    { title: 'Work In Progress', value: stats.inProgress.toString(), icon: <LoaderCircle className="h-7 w-7 text-muted-foreground" /> },
  ];

  return (
    <div className="bg-background flex-1">
        <main className="container mx-auto py-8 px-4 md:px-6">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

            <div className="grid gap-6 md:grid-cols-3">
                {statsCards.map((stat) => (
                <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        {stat.icon}
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                </Card>
                ))}
            </div>

            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Welcome to Content Operation's Requisition Form Dashboard!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            This is your central hub for managing projects and tickets. Use the navigation above to create new tickets, view existing ones, or manage your projects on the Kanban board.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </main>
    </div>
  );
}
