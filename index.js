
```javascript
import Anthropic from '@anthropic-ai/sdk';
import * as readline from 'readline';

const client = new Anthropic();

// Initialize habits storage
let habits = [];
let dailyLogs = [];

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to get today's date
function getTodayDate() {
  return formatDate(new Date());
}

// Function to add a new habit
function addHabit(habitName) {
  const habit = {
    id: habits.length + 1,
    name: habitName,
    createdDate: getTodayDate(),
    frequency: 'daily',
    completed: 0,
    streak: 0
  };
  habits.push(habit);
  return habit;
}

// Function to log a habit completion
function logHabitCompletion(habitId) {
  const today = getTodayDate();
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return null;
  
  // Check if already logged today
  const existingLog = dailyLogs.find(log => log.habitId === habitId && log.date === today);
  if (existingLog) {
    return { error: 'Already logged today' };
  }
  
  const log = {
    habitId: habitId,
    date: today,
    completed: true
  };
  dailyLogs.push(log);
  
  // Update habit stats
  habit.completed += 1;
  updateStreak(habitId);
  
  return log;
}

// Function to update streak
function updateStreak(habitId) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;
  
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = formatDate(checkDate);
    
    const log = dailyLogs.find(l => l.habitId === habitId && l.date === dateStr);
    if (log) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  
  habit.streak = streak;
}

// Function to get statistics
function getStatistics() {
  if (habits.length === 0) {
    return { message: 'No habits tracked yet' };
  }
  
  const stats = {
    totalHabits: habits.length,
    habits: habits.map(habit => {
      const logsForHabit = dailyLogs.filter(log => log.habitId === habit.id);
      const lastWeekLogs = logsForHabit.filter(log => {
        const logDate = new Date(log.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return logDate >= weekAgo;
      });
      
      return {
        id: habit.id,
        name: habit.name,
        totalCompletions: habit.completed,
        currentStreak: habit.streak,
        lastWeekCompletions: lastWeekLogs.length,
        completionRate: habit.completed > 0 ? ((habit.completed / 7).toFixed(2)) : '0.00'
      };
    })
  };
  
  return stats;
}

// Function to get habit details
function getHabitDetails(habitId) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return null;
  
  const logsForHabit = dailyLogs.filter(log => log.habitId === habitId).sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return {
    habit: habit,
    recentLogs: logsForHabit.slice(0, 10)
  };
}

// Function to handle user input through Claude
async function chat(userMessage) {
  const systemPrompt = `You are a helpful health habit tracker assistant. You help users manage and track their daily habits like exercise, drinking water, meditation, reading, etc.

Current habits data:
${JSON.stringify(habits, null, 2)}

Recent logs:
${JSON.stringify(dailyLogs.slice(-10), null, 2)}

You have access to these commands:
1. "add habit [name]" - Add a new habit to track
2. "log habit [id]" - Log completion of a habit
3. "stats" - Show statistics for all habits
4. "details [id]" - Show detailed history for a habit
5. "list" - List all habits

When the user asks to add a habit, respond with JSON like: {"action": "add_habit", "habit_name": "habit name"}
When the user asks to log a habit, respond with JSON like: {"action": "log_habit", "habit_id": 1}
When the user asks for stats, respond with JSON like: {"action": "stats"}
When the user asks for details, respond with JSON like: {"action": "details", "habit_id": 1}
When the user asks to list habits, respond with JSON like: {"action": "list"}

Otherwise, provide helpful conversational responses about the user's habits and health goals.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    return response