'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseISO, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';

interface DashboardClientProps {
    tickets: string[][];
    headers: string[];
    teams: string[];
    statuses: string[];
}

const ClientDate = ({ dateString }: { dateString: string }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted || !dateString) {
        return <>{dateString}</>;
    }
    
    try {
        return <>{format(parseISO(dateString), 'yyyy-MM-dd HH:mm')}</>
    } catch(e) {
        return <>{dateString}</>;
    }
}


export function DashboardClient({ tickets, headers, teams, statuses }: DashboardClientProps) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');

  const createdDateIndex = headers.indexOf('Created Date');
  const statusIndex = headers.indexOf('Status');
  const teamIndex = headers.indexOf('Team');

  const filteredTickets = tickets.filter(row => {
    // Date filter
    const isWithinDate = (() => {
        if (!fromDate && !toDate) return true;
        if (createdDateIndex === -1) return true;
        try {
            const ticketDate = parseISO(row[createdDateIndex]);
            const start = fromDate ? startOfDay(parseISO(fromDate)) : new Date(0);
            const end = toDate ? endOfDay(parseISO(toDate)) : new Date();
            return isWithinInterval(ticketDate, { start, end });
        } catch {
            return false;
        }
    })();
    
    // Status filter
    const hasStatus = statusFilter === 'All' || (statusIndex !== -1 && row[statusIndex] === statusFilter);

    // Team filter
    const hasTeam = teamFilter === 'All' || (teamIndex !== -1 && row[teamIndex] === teamFilter);

    return isWithinDate && hasStatus && hasTeam;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Tickets</CardTitle>
        <CardDescription>Filter and view all submitted tickets.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 border rounded-lg bg-muted/50 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <Label htmlFor="from-date">From</Label>
                <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-40"
                />
            </div>
            <div className="flex items-center gap-2">
                <Label htmlFor="to-date">To</Label>
                <Input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-40"
                />
            </div>
             <div className="flex items-center gap-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter" className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div className="flex items-center gap-2">
                <Label htmlFor="team-filter">Team</Label>
                 <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger id="team-filter" className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => <TableHead key={header}>{header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length > 0 ? (
                filteredTickets.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => {
                       if (cellIndex === createdDateIndex) {
                           return <TableCell key={cellIndex}><ClientDate dateString={cell} /></TableCell>
                       }
                       return <TableCell key={cellIndex}>{cell}</TableCell>
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={headers.length} className="h-24 text-center">
                        No tickets found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
