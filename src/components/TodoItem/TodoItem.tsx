/* eslint-disable jsx-a11y/label-has-associated-control */

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Todo } from '../../types/Todo';
import classNames from 'classnames';
import { deleteTodo, editTodo } from '../../api/todos';
import callError from '../../utils/callError';
import { MainContext } from '../../ContextProvider/ContextProvider';

type TodoProps = {
  todo: Todo;
};

const TodoItem: React.FC<TodoProps> = ({ todo }) => {
  const context = useContext(MainContext);
  const { todos, setTodos, setError, loadingIds } = context;

  const { id, title, completed } = todo;

  const [todoState, setTodoState] = useState({
    isTodoEditing: false,
    editedValue: title,
    isLoading: loadingIds.some(x => x === id),
  });

  const { isTodoEditing, editedValue, isLoading } = todoState;

  const focusedTodo = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTodoState(prev => ({
      ...prev,
      isLoading: loadingIds.some(x => x === id),
    }));
  }, [loadingIds, id]);

  useEffect(() => {
    if (focusedTodo.current) {
      if (isTodoEditing) {
        focusedTodo.current.focus();
      } else {
        focusedTodo.current.blur();
      }
    }
  }, [isTodoEditing]);

  useEffect(() => {
    const cleanInputFocus = (event: MouseEvent) => {
      event.preventDefault();

      const element = event.target as HTMLElement;

      if (element.dataset.cy !== 'TodoTitleField') {
        setTodoState({ ...todoState, isTodoEditing: false });
      }
    };

    if (isTodoEditing) {
      document.addEventListener('click', cleanInputFocus);
    }

    return () => {
      document.removeEventListener('click', cleanInputFocus);
    };
  }, [todoState, isTodoEditing]);

  const handleDeleteClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      setTodoState(prev => ({ ...prev, isLoading: true }));

      deleteTodo(id)
        .then(() => {
          setTodos(todos.filter(task => task.id !== id));
        })
        .catch(() => callError(setError, 'delete'));
    },
    [id, todos, setError, setTodos],
  );

  const handleCompleteTodo = useCallback(() => {
    const newStatus = !completed;

    setTodoState(prev => ({
      ...prev,
      completed: newStatus,
      isLoading: true,
    }));

    editTodo(id, { completed: newStatus })
      .then((res: Todo) => {
        setTodos((prev: Todo[]) =>
          prev.map(task => (task.id === id ? res : task)),
        );
      })
      .catch(() => {
        setTodoState(prev => ({ ...prev, completed: completed }));
        callError(setError, 'update');
      })
      .finally(() => {
        setTodoState(prev => ({ ...prev, isLoading: false }));
      });
  }, [setTodoState, id, completed, setTodos, setError]);

  const saveTodoTitleChanges = useCallback(() => {
    if (title === editedValue) {
      setTodoState(prev => ({ ...prev, isTodoEditing: false }));

      return;
    }

    setTodoState(prev => ({ ...prev, isLoading: true }));

    editTodo(id, { title: editedValue })
      .then((res: Todo) => {
        setTodos((prev: Todo[]) =>
          prev.map(task => (task.id === id ? res : task)),
        );
      })
      .catch(() => callError(setError, 'update'))
      .finally(() => {
        setTodoState(prev => ({
          ...prev,
          isLoading: false,
          isTodoEditing: false,
        }));
      });
  }, [setTodoState, id, title, editedValue, setTodos, setError]);

  const handleEditFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      saveTodoTitleChanges();
    },
    [saveTodoTitleChanges],
  );

  return (
    <div
      key={id}
      data-cy="Todo"
      className={`todo ${completed ? 'completed' : ''}`}
    >
      <label className="todo__status-label">
        <input
          data-cy="TodoStatus"
          type="checkbox"
          className="todo__status"
          checked={completed}
          onChange={handleCompleteTodo}
        />
      </label>

      {todoState.isTodoEditing ? (
        <form onSubmit={handleEditFormSubmit}>
          <input
            data-cy="TodoTitleField"
            type="text"
            className="todo__title-field"
            placeholder="Empty todo will be deleted"
            value={editedValue}
            ref={focusedTodo}
            onBlur={() => saveTodoTitleChanges()}
            onChange={e =>
              setTodoState({ ...todoState, editedValue: e.target.value })
            }
          />
        </form>
      ) : (
        <span
          data-cy="TodoTitle"
          className="todo__title"
          onDoubleClick={() =>
            setTodoState({ ...todoState, isTodoEditing: true })
          }
        >
          {editedValue}
        </span>
      )}

      {/* Remove button appears only on hover */}
      <button
        type="button"
        className="todo__remove"
        data-cy="TodoDelete"
        onClick={handleDeleteClick}
      >
        ×
      </button>

      {/* overlay will cover the todo while it is being deleted or updated */}
      <div
        data-cy="TodoLoader"
        className={classNames('modal overlay', {
          'is-active': isLoading,
        })}
      >
        <div className="modal-background has-background-white-ter" />
        <div className="loader" />
      </div>
    </div>
  );
};

export default TodoItem;
