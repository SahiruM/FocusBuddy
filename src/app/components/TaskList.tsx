import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Task } from './MainApp';

interface TaskListProps {
  tasks: Task[];
  activeTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onAddTask: (taskName: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskList({ tasks, activeTaskId, onSelectTask, onAddTask, onDeleteTask }: TaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim()) {
      onAddTask(newTaskName.trim());
      setNewTaskName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-card border-2 border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg cute-shadow">
      <h3 className="mb-3 sm:mb-4 text-foreground text-xl">Tasks</h3>
      <div className="space-y-2 sm:space-y-2.5">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="group"
            >
              <button
                onClick={() => onSelectTask(task.id)}
                className={`w-full flex items-center gap-3 p-3 sm:p-3.5 rounded-xl transition-all active:scale-98 hover:translate-x-1 ${
                  activeTaskId === task.id
                    ? 'bg-primary/10 border-2 border-primary/30 shadow-md'
                    : 'bg-muted/50 border-2 border-transparent hover:bg-accent'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white/50"
                  style={{ backgroundColor: task.color }}
                />
                <span className="flex-1 text-left text-foreground">{task.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask(task.id);
                  }}
                  className="opacity-60 sm:opacity-0 group-hover:opacity-100 sm:transition-opacity p-1.5 sm:p-1 hover:bg-destructive/20 rounded-lg touch-manipulation"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {isAdding ? (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="p-3 rounded-xl bg-muted/50 border-2 border-primary/30 shadow-md"
          >
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="New task name..."
              autoFocus
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewTaskName('');
                }
              }}
              onBlur={() => {
                if (!newTaskName.trim()) setIsAdding(false);
              }}
            />
          </motion.form>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center gap-2 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all border-2 border-dashed border-primary/30 hover:shadow-md"
          >
            <Plus className="w-4 h-4" style={{ color: 'var(--lavender)' }} />
            <span style={{ color: 'var(--lavender)' }}>Add Task</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}