"use server";

import { intelligentTicketRouting, type IntelligentTicketRoutingInput } from '@/ai/flows/intelligent-ticket-routing';
import { appendRow, getSheetData, addColumn, updateColumn, deleteColumn, batchUpdateSheet, getSheetId } from '@/lib/google-sheets';
import type { FormQuestion, KanbanTask } from '@/lib/mock-data';

export async function getTicketRoutingSuggestion(formData: FormData) {
  try {
    const description = formData.get('details') as string;
    const name = formData.get('name') as string;

    if (!description || !name) {
      return { success: false, error: 'Name and details are required.' };
    }

    const input: IntelligentTicketRoutingInput = {
      description: description,
      productCourseRequisitionName: name,
      adminSettingsLabels: 'Urgent, Bug, Feature Request, High Priority, Billing, Technical Issue, How-to',
      knowledgeBaseArticles: `
        1. "Password Reset Guide": How to reset your account password.
        2. "Billing and Subscriptions": Managing your subscription and payment methods.
        3. "Getting Started with SheetFlow": A guide for new users.
        4. "API Integration Manual": Technical documentation for developers.
      `,
      teamNames: 'Engineering, Support, Sales, Marketing'
    };

    const result = await intelligentTicketRouting(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('AI routing error:', error);
    if (error instanceof Error) {
        return { success: false, error: `An error occurred: ${error.message}` };
    }
    return { success: false, error: 'An unknown error occurred while getting AI suggestion.' };
  }
}

export async function submitTicket(data: Record<string, any>) {
    const dataWithTimestamp = {
        ...data,
        'Ticket ID': `TICKET-${Date.now()}`,
        'Created Date': new Date().toISOString(),
        'Status': 'Open'
    };
    return await appendRow(dataWithTimestamp, 'Sheet1');
}

// Inferred question type based on header text
function inferQuestionType(header: string): { type: FormQuestion['questionType'], options: string[] } {
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('(select)')) return { type: 'Select', options: [] };
    if (lowerHeader.includes('(checkbox:')) {
      const optionsMatch = lowerHeader.match(/\(checkbox:\s*(.*?)\)/);
      const options = optionsMatch ? optionsMatch[1].split(';').map(o => o.trim()) : [];
      return { type: 'Checkbox', options };
    }
    if (lowerHeader.includes('describe') || lowerHeader.includes('detail')) return { type: 'Textarea', options: [] };
    if (lowerHeader.includes('date')) return { type: 'Date', options: [] };
    if (lowerHeader.includes('url') || lowerHeader.includes('link')) return { type: 'Url', options: [] };

    return { type: 'Text', options: [] };
}


export async function getFormQuestions(team: string): Promise<FormQuestion[]> {
    if (!team) return [];

    const sheetData = await getSheetData('Sheet5');
    if (!sheetData.values || sheetData.values.length === 0) {
        // Initialize Sheet5 with headers if it's empty
        await appendRow({ 'Team': 'Team', 'QuestionText': 'QuestionText'}, 'Sheet5', true);
        return [];
    }
    const headers = sheetData.values[0];
    const teamIndex = headers.indexOf('Team');
    const questionTextIndex = headers.indexOf('QuestionText');

    if (teamIndex === -1 || questionTextIndex === -1) {
        // This case indicates Sheet5 is not set up correctly.
        // Let's try to set it up.
        await appendRow({ 'Team': 'Team', 'QuestionText': 'QuestionText'}, 'Sheet5', true);
        return [];
    }

    const teamQuestions = sheetData.values
        .slice(1)
        .map((row, index) => ({ row, originalIndex: index + 1 })) // Keep track of original index
        .filter(({ row }) => row[teamIndex] === team)
        .map(({ row, originalIndex }) => {
            const questionText = row[questionTextIndex];
            const { type, options } = inferQuestionType(questionText);
            return {
                id: `col-${originalIndex}`,
                questionText: questionText,
                questionType: type,
                options: options,
            };
        });

    return teamQuestions;
}


export async function addFormQuestion(team: string, questionText: string) {
    if (!questionText || !team) {
        return { success: false, error: 'Team and question text cannot be empty.' };
    }
    return await appendRow({ Team: team, QuestionText: questionText }, 'Sheet5');
}

async function findQuestionRowIndex(team: string, questionText: string): Promise<number> {
    const sheetData = await getSheetData('Sheet5');
    if (!sheetData.values || sheetData.values.length === 0) throw new Error('Sheet5 is empty or not found.');

    const headers = sheetData.values[0];
    const teamIndex = headers.indexOf('Team');
    const questionTextIndex = headers.indexOf('QuestionText');

    if (teamIndex === -1 || questionTextIndex === -1) throw new Error('Required columns (Team, QuestionText) not found in Sheet5.');

    const rowIndex = sheetData.values.findIndex(row => row[teamIndex] === team && row[questionTextIndex] === questionText);

    if (rowIndex === -1) throw new Error(`Question "${questionText}" for team "${team}" not found.`);
    return rowIndex;
}


export async function updateFormQuestion(team: string, originalQuestionText: string, newQuestionText: string) {
     if (!newQuestionText) {
        return { success: false, error: 'New question text cannot be empty.' };
    }
    try {
        const rowIndex = await findQuestionRowIndex(team, originalQuestionText);
        
        const sheetId = await getSheetId('Sheet5');
        const sheetData = await getSheetData('Sheet5');
        const headers = sheetData.values[0];
        const questionTextColIndex = headers.indexOf('QuestionText');
        
        const updateRequest = {
            updateCells: {
                range: {
                    sheetId: sheetId,
                    startRowIndex: rowIndex,
                    endRowIndex: rowIndex + 1,
                    startColumnIndex: questionTextColIndex,
                    endColumnIndex: questionTextColIndex + 1,
                },
                rows: [ { values: [{ userEnteredValue: { stringValue: newQuestionText } }] } ],
                fields: 'userEnteredValue'
            }
        };

        return await batchUpdateSheet([updateRequest]);
    } catch (error) {
        console.error('Error updating form question:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function deleteFormQuestion(team: string, questionText: string) {
    try {
        const rowIndex = await findQuestionRowIndex(team, questionText);
        const sheetId = await getSheetId('Sheet5');
        
        const deleteRequest = {
            deleteDimension: {
                range: {
                    sheetId: sheetId,
                    dimension: "ROWS",
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1
                }
            }
        };

        return await batchUpdateSheet([deleteRequest]);
    } catch (error) {
        console.error('Error deleting form question:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function getAllTickets() {
    return await getSheetData('Sheet1');
}

export async function updateTicketStatus(rowIndex: number, newStatus: string) {
     try {
        const ticketSheetData = await getSheetData('Sheet1');
        if (!ticketSheetData.values || ticketSheetData.values.length === 0) {
            return { success: false, error: 'No ticket data found to update.' };
        }
        const headers = ticketSheetData.values[0];
        const statusColIndex = headers.indexOf('Status');
         if (statusColIndex === -1) {
             return { success: false, error: 'Status column not found in Sheet1.' };
         }
         
        const ticketSheetId = await getSheetId('Sheet1');

        const updateRequest = {
            updateCells: {
                range: {
                    sheetId: ticketSheetId,
                    startRowIndex: rowIndex, // This is now the correct sheet row index
                    endRowIndex: rowIndex + 1,
                    startColumnIndex: statusColIndex,
                    endColumnIndex: statusColIndex + 1,
                },
                rows: [ { values: [{ userEnteredValue: { stringValue: newStatus } }] } ],
                fields: 'userEnteredValue'
            }
        };
        
        return await batchUpdateSheet([updateRequest]);
    } catch (error) {
        console.error('Error updating ticket status:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}


export async function getMembers() {
    return await getSheetData('Sheet2');
}

export async function addMember(name: string, team: string) {
    if (!name || !team) {
        return { success: false, error: 'Name and team are required.' };
    }

    try {
        const sheetData = await getSheetData('Sheet2');
        const headers = sheetData.values?.[0] || ['Name', 'Team'];
        if (!sheetData.values || sheetData.values.length === 0) {
             await appendRow(Object.fromEntries(headers.map(h => [h, h])), 'Sheet2', true);
        }

        const teamIndex = headers.indexOf('Team');
        const existingTeams = new Set((sheetData.values || []).slice(1).map(row => row[teamIndex]));
        
        const predefinedTeams = ["CM", "SMD", "QAC", "Class Ops"];
        const teamsToAdd = predefinedTeams.filter(t => !existingTeams.has(t));

        for (const t of teamsToAdd) {
            await appendRow({ Name: 'Team Default', Team: t }, 'Sheet2');
        }

        if (name === 'Team Default' && predefinedTeams.includes(team)) {
            // This was just a seeding call, no need to add another.
            return { success: true };
        }

        return await appendRow({ Name: name, Team: team }, 'Sheet2');

    } catch (error) {
         console.error('Error adding member:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}


export async function getProjects() {
    return await getSheetData('Sheet3');
}

export async function createProjectFromTicket(ticketRow: { rowIndex: number, values: string[] }) {
    try {
        const ticketSheetData = await getSheetData('Sheet1');
        const ticketHeaders = ticketSheetData.values[0];

        const ticketIdIndex = ticketHeaders.findIndex(h => h.toLowerCase().includes('id'));
        const projectId = ticketRow.values[ticketIdIndex] || `PROJ-${Date.now()}`;

        const projectHeaders = ['Project ID', 'Start Date', 'End Date', 'Assignee', 'Kanban Initialized', ...ticketHeaders];

        // Ensure Sheet3 has headers
        const projectSheetData = await getSheetData('Sheet3');
        if (!projectSheetData.values || projectSheetData.values.length === 0) {
            await appendRow(projectHeaders.reduce((acc, h) => ({...acc, [h]: ''}), {}), 'Sheet3', true);
        }

        const projectData: Record<string, string> = {
            'Project ID': projectId,
            'Start Date': '',
            'End Date': '',
            'Assignee': '',
            'Kanban Initialized': 'No'
        };
        ticketHeaders.forEach((header, i) => {
            projectData[header] = ticketRow.values[i] || '';
        });
        
        await appendRow(projectData, 'Sheet3');

        // Instead of deleting, update the status of the ticket
        await updateTicketStatus(ticketRow.rowIndex, 'In Progress');

        return { success: true };

    } catch(error) {
        console.error('Error creating project:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function updateProject(rowIndex: number, newValues: { [key: string]: string }) {
    try {
        const projectSheetData = await getSheetData('Sheet3');
        if (!projectSheetData.values || projectSheetData.values.length === 0) {
            return { success: false, error: 'No projects found to update.' };
        }
        const headers = projectSheetData.values[0];
        const originalRow = projectSheetData.values[rowIndex];
        if (!originalRow) {
            return { success: false, error: 'Project row not found.' };
        }

        const updatedRow = [...originalRow];
        
        Object.entries(newValues).forEach(([header, value]) => {
            const colIndex = headers.indexOf(header);
            if (colIndex !== -1) {
                updatedRow[colIndex] = value;
            }
        });
        
        const projectSheetId = await getSheetId('Sheet3');

        const updateRequest = {
            updateCells: {
                range: {
                    sheetId: projectSheetId,
                    startRowIndex: rowIndex,
                    endRowIndex: rowIndex + 1,
                    startColumnIndex: 0,
                    endColumnIndex: headers.length,
                },
                rows: [
                    {
                        values: updatedRow.map(val => ({ userEnteredValue: { stringValue: val } }))
                    }
                ],
                fields: 'userEnteredValue'
            }
        };
        
        return await batchUpdateSheet([updateRequest]);
    } catch (error) {
        console.error('Error updating project:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}


export async function initializeKanban(rowIndex: number, projectId: string) {
    try {
        const kanbanSheetData = await getSheetData('Sheet4');
        if (!kanbanSheetData.values || kanbanSheetData.values.length === 0) {
            const headers = ['Project ID', 'Task ID', 'Title', 'Status', 'Assignee', 'Due Date', 'Description', 'Type', 'Priority', 'Tags'];
            await appendRow(headers.reduce((acc, h) => ({...acc, [h]: ''}), {}), 'Sheet4', true);
        }
        
        await appendRow({
            'Project ID': projectId,
            'Task ID': `TASK-${Date.now()}`,
            'Title': 'Project Kick-off',
            'Status': 'todo',
            'Assignee': '',
            'Due Date': '',
            'Description': 'Initial setup and planning for the project.',
            'Type': 'Planning',
            'Priority': 'High',
            'Tags': 'kickoff,planning'
        }, 'Sheet4');

        return await updateProject(rowIndex + 1, { 'Kanban Initialized': 'Yes' });

    } catch (error) {
        console.error('Error initializing Kanban:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function getKanbanTasks(projectId: string): Promise<KanbanTask[]> {
    try {
        const kanbanData = await getSheetData('Sheet4');
        if (!kanbanData.values || kanbanData.values.length < 1) {
            return [];
        }
        const headers = kanbanData.values[0];
        const projectIdIndex = headers.indexOf('Project ID');
        const taskIdIndex = headers.indexOf('Task ID');
        const titleIndex = headers.indexOf('Title');
        const statusIndex = headers.indexOf('Status');
        const assigneeIndex = headers.indexOf('Assignee');
        const dueDateIndex = headers.indexOf('Due Date');
        const descriptionIndex = headers.indexOf('Description');
        const typeIndex = headers.indexOf('Type');
        const priorityIndex = headers.indexOf('Priority');
        const tagsIndex = headers.indexOf('Tags');

        if (projectIdIndex === -1 || taskIdIndex === -1 || statusIndex === -1) {
            throw new Error("Required columns (Project ID, Task ID, Status) not found in Sheet4.");
        }

        return kanbanData.values
            .slice(1)
            .map((row, index) => ({
                sheetRowIndex: index + 2, // 1-based index + header
                id: row[taskIdIndex],
                projectId: row[projectIdIndex],
                title: row[titleIndex],
                status: row[statusIndex] as 'todo' | 'inprogress' | 'review' | 'done',
                assignee: row[assigneeIndex],
                dueDate: row[dueDateIndex],
                description: row[descriptionIndex] || '',
                type: row[typeIndex] || 'Task',
                priority: row[priorityIndex] as 'Low' | 'Medium' | 'High' | 'Critical' || 'Medium',
                tags: row[tagsIndex] ? row[tagsIndex].split(',') : []
            }))
            .filter(task => task.projectId === projectId);

    } catch (error) {
        console.error('Error fetching Kanban tasks:', error);
        return [];
    }
}

export async function addKanbanTask(
    projectId: string, 
    taskData: Omit<KanbanTask, 'id' | 'sheetRowIndex' | 'projectId' | 'status'>
) {
    const dataToSave = {
        'Project ID': projectId,
        'Task ID': `TASK-${Date.now()}`,
        'Title': taskData.title,
        'Status': 'todo',
        'Description': taskData.description,
        'Type': taskData.type,
        'Priority': taskData.priority,
        'Assignee': taskData.assignee,
        'Due Date': taskData.dueDate,
        'Tags': taskData.tags.join(','),
    };
    return await appendRow(dataToSave, 'Sheet4');
}

export async function updateKanbanTaskStatus(sheetRowIndex: number, newStatus: string) {
     try {
        const kanbanSheetData = await getSheetData('Sheet4');
        if (!kanbanSheetData.values || kanbanSheetData.values.length === 0) {
            return { success: false, error: 'No kanban data found to update.' };
        }
        const headers = kanbanSheetData.values[0];
        const statusColIndex = headers.indexOf('Status');
         if (statusColIndex === -1) {
             return { success: false, error: 'Status column not found in Sheet4.' };
         }
         
        const kanbanSheetId = await getSheetId('Sheet4');

        const updateRequest = {
            updateCells: {
                range: {
                    sheetId: kanbanSheetId,
                    startRowIndex: sheetRowIndex - 1,
                    endRowIndex: sheetRowIndex,
                    startColumnIndex: statusColIndex,
                    endColumnIndex: statusColIndex + 1,
                },
                rows: [ { values: [{ userEnteredValue: { stringValue: newStatus } }] } ],
                fields: 'userEnteredValue'
            }
        };
        
        return await batchUpdateSheet([updateRequest]);
    } catch (error) {
        console.error('Error updating task status:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function deleteKanbanTask(sheetRowIndex: number) {
    try {
        const kanbanSheetId = await getSheetId('Sheet4');
        const deleteRequest = {
            deleteDimension: {
                range: {
                    sheetId: kanbanSheetId,
                    dimension: "ROWS",
                    startIndex: sheetRowIndex - 1, // Convert 1-based to 0-based
                    endIndex: sheetRowIndex
                }
            }
        };
        return await batchUpdateSheet([deleteRequest]);
    } catch (error) {
        console.error('Error deleting task:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}
