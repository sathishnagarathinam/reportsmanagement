export interface FieldConfig {
    id: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'textarea' | 'select';
    value: string | number | boolean;
    options?: { label: string; value: string }[];
    // Add any other properties your fields might have
}

export interface CardConfig {
    id: string;
    type: string; // e.g., 'text', 'image', 'form'
    fields: FieldConfig[];
    // Add any other properties your cards might have, like parentId for nesting
    parentId?: string | null;
}

export interface PageConfig {
    id: string;
    name: string;
    cards: CardConfig[];
}