
import { getAllTickets, getMembers } from './actions';
import { unstable_noStore as noStore } from 'next/cache';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  noStore();
  try {
    const [ticketData, memberData] = await Promise.all([getAllTickets(), getMembers()]);
    
    let tickets: string[][] = [];
    let ticketHeaders: string[] = [];
    let teams: string[] = [];
    let statuses: string[] = [];

    if (ticketData.values && ticketData.values.length > 0) {
        ticketHeaders = ticketData.values[0];
        tickets = ticketData.values.slice(1).reverse();
        const statusIndex = ticketHeaders.indexOf('Status');
        
        const uniqueStatuses = new Set<string>();
        
        if (statusIndex !== -1) {
            tickets.forEach(ticket => {
                const status = ticket[statusIndex];
                if (status) uniqueStatuses.add(status);
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


    return { tickets, ticketHeaders, teams, statuses };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return { 
        tickets: [],
        ticketHeaders: [],
        teams: ['All'],
        statuses: ['All']
    };
  }
}

export default async function Home() {
  const { tickets, ticketHeaders, teams, statuses } = await getDashboardData();

  return (
    <div className="bg-background flex-1">
        <main className="container mx-auto py-8 px-4 md:px-6">
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
