import { motion } from 'framer-motion';
import { FunnelSimple, AddressBook, Buildings, Note, CheckSquare } from '@phosphor-icons/react';

const EMPTY_STATES = {
  leads: {
    icon: FunnelSimple,
    title: 'No leads yet',
    desc: 'Add your first lead to track your pipeline',
  },
  contacts: {
    icon: AddressBook,
    title: 'No contacts',
    desc: 'Import or add contacts manually',
  },
  organizations: {
    icon: Buildings,
    title: 'No organizations',
    desc: 'Link orgs to your contacts',
  },
  notes: {
    icon: Note,
    title: 'Nothing noted yet',
    desc: 'Capture important details with a note',
  },
  tasks: {
    icon: CheckSquare,
    title: 'All clear!',
    desc: 'No tasks scheduled for today',
  },
};

export function EmptyState({ type = 'leads', title, desc }) {
  const config = EMPTY_STATES[type] || EMPTY_STATES.leads;
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayDesc = desc || config.desc;

  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div className="empty-state-icon">
        <Icon size={48} weight="duotone" />
      </div>
      <div className="empty-state-title">{displayTitle}</div>
      <div className="empty-state-desc">{displayDesc}</div>
    </motion.div>
  );
}
