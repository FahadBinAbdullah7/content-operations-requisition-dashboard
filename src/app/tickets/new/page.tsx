
'use client'

import { useState, useEffect } from 'react';
import { TicketForm } from '@/components/TicketForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getWorkTypes, getTeams } from '@/app/actions';

export default function NewTicketPage() {
  const [teams, setTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [workTypeInfo, setWorkTypeInfo] = useState<{ question: string; options: string[] }>({ question: '', options: [] });
  const [selectedWorkType, setSelectedWorkType] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInitialData() {
        setIsLoading(true);
        try {
            const [types, fetchedTeams] = await Promise.all([getWorkTypes(), getTeams()]);
            setWorkTypeInfo(types);
            setTeams(fetchedTeams);
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        } finally {
            setIsLoading(false);
        }
    }
    fetchInitialData();
  }, []);

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">
      <div className="space-y-2 text-center mb-8">
        <h1 className="text-3xl font-bold">Create a New Ticket</h1>
        <p className="text-muted-foreground">Fill out the form below to submit a new ticket.</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
             <Label htmlFor="team-select">Select Your Team/Department</Label>
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
          </div>
          <div className="space-y-2">
             <Label htmlFor="work-type-select">{workTypeInfo.question || 'Work Type'}</Label>
             {isLoading ? (
                <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading work types...
                </div>
             ) : (
                <Select value={selectedWorkType} onValueChange={setSelectedWorkType}>
                    <SelectTrigger id="work-type-select" className="w-full">
                        <SelectValue placeholder="Select the type of work" />
                    </SelectTrigger>
                    <SelectContent>
                        {workTypeInfo.options.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             )}
          </div>
        </CardContent>
      </Card>
      
      {selectedTeam && selectedWorkType && <TicketForm team={selectedTeam} workType={selectedWorkType} />}
    </div>
  );
}

