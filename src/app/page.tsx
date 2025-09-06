import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, CheckCircle2, LoaderCircle } from 'lucide-react';
import { getAllTickets, getMembers } from './actions';
import { unstable_noStore as noStore } from 'next/cache';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  noStore();
  try {
    const [ticketData, memberData] = await Promise.all([getAllTickets(), getMembers()]);
    
    let stats = {
        total: 0,
        solved: 0,
        inProgress: 0,
    };

    let tickets: string[][] = [];
    let ticketHeaders: string[] = [];
    let teams: string[] = [];
    let statuses: string[] = [];

    if (ticketData.values && ticketData.values.length > 0) {
        ticketHeaders = ticketData.values[0];
        tickets = ticketData.values.slice(1).reverse();
        const statusIndex = ticketHeaders.indexOf('Status');
        
        stats.total = tickets.length;

        const uniqueStatuses = new Set<string>();
        
        if (statusIndex !== -1) {
            tickets.forEach(ticket => {
                const status = ticket[statusIndex];
                if (status) uniqueStatuses.add(status);
                if (status === 'Done') stats.solved++;
                else if (status === 'In Progress') stats.inProgress++;
            });
        }
        statuses = ['All', ...Array.from(uniqueStatuses)];
    }
    
    if (memberData && memberData.values && memberData.values.length > 0) {
        const teamIndex = memberData.values[0].indexOf('Team');
        if (teamIndex !== -1) {
            const uniqueTeams = new Set<string>();
            memberData.values.slice(1).forEach(row => {
                if (row[teamIndex]) uniqueTeams.add(row[teamIndex]);
            });
            teams = ['All', ...Array.from(uniqueTeams)];
        }
    }


    return { stats, tickets, ticketHeaders, teams, statuses };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return { 
        stats: { total: 0, solved: 0, inProgress: 0 },
        tickets: [],
        ticketHeaders: [],
        teams: ['All'],
        statuses: ['All']
    };
  }
}

export default async function Home() {
  const { stats, tickets, ticketHeaders, teams, statuses } = await getDashboardData();
  
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
                <DashboardClient 
                    tickets={tickets} 
                    headers={ticketHeaders}
                    teams={teams}
                    statuses={statuses}
                />
            </div>
        </main>
    </div>
  );
}
