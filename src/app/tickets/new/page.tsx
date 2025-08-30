
'use client'

import { useState, useEffect } from 'react';
import { TicketForm } from '@/components/TicketForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function NewTicketPage() {
  const [teams, setTeams] = useState<string[]>(["Marketing", "Media", "EPD", "Content"]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">
      <div className="space-y-2 text-center mb-8">
        <h1 className="text-3xl font-bold">Create a New Ticket</h1>
        <p className="text-muted-foreground">Fill out the form below to submit a new ticket.</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="space-y-2">
             <Label htmlFor="team-select">Select Your Team/Department</Label>
             {isLoading ? (
                <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </div>
             ) : (
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger id="team-select" className="w-full">
                        <SelectValue placeholder="Which team/department are you creating a ticket for?" />
                    </SelectTrigger>
                    <SelectContent>
                        {teams.map(team => (
                            <SelectItem key={team} value={team}>{team}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             )}
          </div>
        </CardContent>
      </Card>
      
      {selectedTeam && <TicketForm team={selectedTeam} />}
    </div>
  );
}
