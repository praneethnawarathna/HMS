import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';

const ActionButtons = ({
    viewLink,
    onView,
    editLink,
    onEdit,
    onDelete,
    viewTitle = 'View details',
    editTitle = 'Edit item',
    deleteTitle = 'Delete item',
    showLabels = true,
    size = 'sm', // 'sm' or 'md'
    disabled = false
}) => {
    const btnSizeClasses = !showLabels
        ? (size === 'sm' ? 'p-1.5 text-xs' : 'p-2 text-sm')
        : (size === 'sm' ? 'px-2.5 py-1 text-xs gap-1.5' : 'px-3 py-1.5 text-sm gap-2');

    const iconSize = size === 'sm' ? 14 : 16;

    const baseClass = `inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${btnSizeClasses}`;

    const viewClass = `${baseClass} bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300 focus:ring-blue-400`;
    const editClass = `${baseClass} bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300 focus:ring-amber-400`;
    const deleteClass = `${baseClass} bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300 focus:ring-rose-400`;

    return (
        <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
            {/* VIEW BUTTON */}
            {(viewLink || onView) && (
                viewLink ? (
                    <Link
                        to={viewLink}
                        title={viewTitle}
                        className={viewClass}
                    >
                        <Eye size={iconSize} className="shrink-0" />
                        {showLabels && <span>View</span>}
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={onView}
                        title={viewTitle}
                        disabled={disabled}
                        className={viewClass}
                    >
                        <Eye size={iconSize} className="shrink-0" />
                        {showLabels && <span>View</span>}
                    </button>
                )
            )}

            {/* EDIT BUTTON */}
            {(editLink || onEdit) && (
                editLink ? (
                    <Link
                        to={editLink}
                        title={editTitle}
                        className={editClass}
                    >
                        <Pencil size={iconSize} className="shrink-0" />
                        {showLabels && <span>Edit</span>}
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={onEdit}
                        title={editTitle}
                        disabled={disabled}
                        className={editClass}
                    >
                        <Pencil size={iconSize} className="shrink-0" />
                        {showLabels && <span>Edit</span>}
                    </button>
                )
            )}

            {/* DELETE BUTTON */}
            {onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    title={deleteTitle}
                    disabled={disabled}
                    className={deleteClass}
                >
                    <Trash2 size={iconSize} className="shrink-0" />
                    {showLabels && <span>Delete</span>}
                </button>
            )}
        </div>
    );
};

export default ActionButtons;
