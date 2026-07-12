import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

// ============================================================================
// Types for User-Owned Forms
// ============================================================================

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'dropdown'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'checkbox-group'
  | 'switch'
  | 'file'
  | 'image'
  | 'email'
  | 'phone'
  | 'url'
  | 'calculated'
  | 'reference'
  | 'section';

export interface FormFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: string; color?: string }>;
  validation?: FormFieldValidation;
  conditional?: {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
    value?: any;
  };
  // For calculated fields
  calculation?: {
    formula: string;
    decimalPlaces?: number;
    prefix?: string;
    suffix?: string;
  };
  // For reference fields
  reference?: {
    collection: string;
    displayField: string;
    valueField: string;
    filters?: Record<string, any>;
  };
  layout?: {
    width?: 'full' | 'half' | 'third' | 'quarter';
    row?: number;
    column?: number;
  };
}

export interface FormSharingPermission {
  userId: string;
  email?: string;
  role: 'viewer' | 'editor' | 'admin';
  grantedAt: string;
  grantedBy: string;
}

export interface UserFormDefinition {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  // Ownership
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Sharing & Permissions
  isPublic: boolean;
  sharedWith: FormSharingPermission[];
  // Settings
  settings?: {
    allowMultipleSubmissions?: boolean;
    requireAuthentication?: boolean;
    submissionLimit?: number;
    startDate?: string;
    endDate?: string;
    customStyling?: boolean;
    theme?: Record<string, any>;
  };
  // Metadata for reporting
  category?: string;
  tags?: string[];
  version: number;
}

export interface FormSubmission {
  id: string;
  formId: string;
  // Ownership - who submitted
  submittedBy: string;
  submittedAt: string;
  // Data
  data: Record<string, any>;
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  source?: 'web' | 'mobile' | 'api';
  // For calculated/summary fields
  calculatedFields?: Record<string, any>;
  // Status
  status: 'active' | 'edited' | 'deleted';
  editHistory?: Array<{
    editedAt: string;
    editedBy: string;
    changes: Record<string, { old: any; new: any }>;
  }>;
}

export interface FormSummary {
  formId: string;
  totalSubmissions: number;
  lastSubmissionAt?: string;
  uniqueSubmitters: number;
  fieldCounts: Record<string, { filled: number; empty: number }>;
}

// ============================================================================
// User Form Builder Service
// ============================================================================

class UserFormBuilderService {
  private static readonly FORMS_COLLECTION = 'user_forms';
  private static readonly SUBMISSIONS_COLLECTION = 'form_submissions';
  private static readonly SUMMARIES_COLLECTION = 'form_summaries';
  private static formCache = new Map<string, UserFormDefinition>();

  // ============================================================================
  // Form Definition CRUD
  // ============================================================================

  /**
   * Create a new form definition (owned by current user)
   */
  static async createForm(
    userId: string,
    formData: Omit<UserFormDefinition, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'version' | 'isPublic' | 'sharedWith'>
  ): Promise<UserFormDefinition> {
    const now = new Date().toISOString();
    const formId = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newForm: UserFormDefinition = {
      ...formData as any,
      id: formId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      sharedWith: [],
      isPublic: false
    };

    await setDoc(doc(db, this.FORMS_COLLECTION, formId), newForm);
    this.formCache.set(formId, newForm);

    return newForm;
  }

  /**
   * Get a form definition by ID
   * Only returns the form if user has access (owner, shared with, or public)
   */
  static async getForm(formId: string, userId: string): Promise<UserFormDefinition | null> {
    try {
      // Check cache first
      const cached = this.formCache.get(formId);
      if (cached && this.hasAccess(cached, userId)) {
        return cached;
      }

      const docSnap = await getDoc(doc(db, this.FORMS_COLLECTION, formId));
      if (!docSnap.exists()) {
        return null;
      }

      const form = docSnap.data() as UserFormDefinition;
      this.formCache.set(formId, form);

      if (!this.hasAccess(form, userId)) {
        return null;
      }

      return form;
    } catch (error) {
      console.error('Error getting form:', error);
      return null;
    }
  }

  /**
   * Get all forms accessible by the user (owned by them or shared with them)
   * STRICT ISOLATION: Only returns forms owned by the user
   * Public forms are NOT included by default to ensure isolation
   */
  static async getUserForms(userId: string): Promise<UserFormDefinition[]> {
    try {
      const forms: UserFormDefinition[] = [];

      // Get forms created by the user ONLY
      // This ensures strict isolation - users only see their own forms
      const ownedQuery = query(
        collection(db, this.FORMS_COLLECTION),
        where('createdBy', '==', userId),
        orderBy('updatedAt', 'desc')
      );

      const ownedSnapshot = await getDocs(ownedQuery);
      ownedSnapshot.forEach(doc => {
        const form = doc.data() as UserFormDefinition;
        this.formCache.set(form.id, form);
        forms.push(form);
      });

      // NOTE: Public forms are intentionally NOT fetched here
      // to maintain strict user isolation. If you need to browse
      // public forms, use a separate method like getPublicForms()

      return forms.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Error getting user forms:', error);
      return [];
    }
  }

  /**
   * Get public forms that are available to all users
   * Use this method explicitly when you need to browse public forms
   */
  static async getPublicForms(userId: string): Promise<UserFormDefinition[]> {
    try {
      const forms: UserFormDefinition[] = [];

      const publicQuery = query(
        collection(db, this.FORMS_COLLECTION),
        where('isPublic', '==', true)
      );

      const publicSnapshot = await getDocs(publicQuery);
      publicSnapshot.forEach(doc => {
        const form = doc.data() as UserFormDefinition;
        // Filter out forms already owned by the user
        if (form.createdBy !== userId && !forms.find(f => f.id === form.id)) {
          this.formCache.set(form.id, form);
          forms.push(form);
        }
      });

      return forms.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Error getting public forms:', error);
      return [];
    }
  }

  /**
   * Update a form definition
   */
  static async updateForm(
    formId: string,
    userId: string,
    updates: Partial<Omit<UserFormDefinition, 'id' | 'createdBy' | 'createdAt'>>
  ): Promise<UserFormDefinition | null> {
    const form = await this.getForm(formId, userId);

    if (!form) {
      throw new Error('Form not found or access denied');
    }

    if (!this.canEdit(form, userId)) {
      throw new Error('You do not have permission to edit this form');
    }

    const updatedForm: UserFormDefinition = {
      ...form,
      ...updates,
      id: form.id,
      createdBy: form.createdBy,
      createdAt: form.createdAt,
      updatedAt: new Date().toISOString(),
      version: form.version + 1
    };

    await updateDoc(doc(db, this.FORMS_COLLECTION, formId), {
      ...updates,
      updatedAt: updatedForm.updatedAt,
      version: updatedForm.version
    });

    this.formCache.set(formId, updatedForm);
    return updatedForm;
  }

  /**
   * Delete a form and all its submissions
   */
  static async deleteForm(formId: string, userId: string): Promise<void> {
    const form = await this.getForm(formId, userId);

    if (!form) {
      throw new Error('Form not found or access denied');
    }

    if (!this.canDelete(form, userId)) {
      throw new Error('You do not have permission to delete this form');
    }

    const batch = writeBatch(db);

    // Delete form definition
    batch.delete(doc(db, this.FORMS_COLLECTION, formId));

    // Delete all submissions
    const submissionsQuery = query(
      collection(db, this.SUBMISSIONS_COLLECTION),
      where('formId', '==', formId)
    );
    const submissionsSnapshot = await getDocs(submissionsQuery);
    submissionsSnapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    // Delete summary
    batch.delete(doc(db, this.SUMMARIES_COLLECTION, formId));

    await batch.commit();
    this.formCache.delete(formId);
  }

  // ============================================================================
  // Form Sharing & Permissions
  // ============================================================================

  /**
   * Share a form with another user
   */
  static async shareForm(
    formId: string,
    ownerId: string,
    shareWith: { userId: string; email?: string; role: 'viewer' | 'editor' | 'admin' }
  ): Promise<void> {
    const form = await this.getForm(formId, ownerId);

    if (!form || form.createdBy !== ownerId) {
      throw new Error('Only the form owner can share the form');
    }

    const permission: FormSharingPermission = {
      userId: shareWith.userId,
      email: shareWith.email,
      role: shareWith.role,
      grantedAt: new Date().toISOString(),
      grantedBy: ownerId
    };

    await updateDoc(doc(db, this.FORMS_COLLECTION, formId), {
      sharedWith: arrayUnion(permission)
    });

    // Update cache
    const cached = this.formCache.get(formId);
    if (cached) {
      cached.sharedWith = [...(cached.sharedWith || []), permission];
    }
  }

  /**
   * Remove sharing permission from a user
   */
  static async unshareForm(
    formId: string,
    ownerId: string,
    userIdToRemove: string
  ): Promise<void> {
    const form = await this.getForm(formId, ownerId);

    if (!form || form.createdBy !== ownerId) {
      throw new Error('Only the form owner can modify sharing permissions');
    }

    const permissionToRemove = form.sharedWith?.find(p => p.userId === userIdToRemove);

    if (permissionToRemove) {
      await updateDoc(doc(db, this.FORMS_COLLECTION, formId), {
        sharedWith: arrayRemove(permissionToRemove)
      });

      // Update cache
      const cached = this.formCache.get(formId);
      if (cached) {
        cached.sharedWith = cached.sharedWith?.filter(p => p.userId !== userIdToRemove) || [];
      }
    }
  }

  /**
   * Update form public/private status
   */
  static async setFormPublicStatus(
    formId: string,
    userId: string,
    isPublic: boolean
  ): Promise<void> {
    const form = await this.getForm(formId, userId);

    if (!form) {
      throw new Error('Form not found or access denied');
    }

    if (form.createdBy !== userId) {
      throw new Error('Only the form owner can change visibility settings');
    }

    await updateDoc(doc(db, this.FORMS_COLLECTION, formId), {
      isPublic,
      updatedAt: new Date().toISOString()
    });

    // Update cache
    const cached = this.formCache.get(formId);
    if (cached) {
      cached.isPublic = isPublic;
    }
  }

  // ============================================================================
  // Permission Helpers
  // ============================================================================

  /**
   * Check if user has access to a form
   */
  private static hasAccess(form: UserFormDefinition, userId: string): boolean {
    if (form.createdBy === userId) return true;
    if (form.isPublic) return true;
    if (form.sharedWith?.some(p => p.userId === userId)) return true;
    return false;
  }

  /**
   * Check if user can edit a form
   */
  private static canEdit(form: UserFormDefinition, userId: string): boolean {
    if (form.createdBy === userId) return true;
    const share = form.sharedWith?.find(p => p.userId === userId);
    if (share?.role === 'editor' || share?.role === 'admin') return true;
    return false;
  }

  /**
   * Check if user can delete a form
   */
  private static canDelete(form: UserFormDefinition, userId: string): boolean {
    if (form.createdBy === userId) return true;
    const share = form.sharedWith?.find(p => p.userId === userId);
    if (share?.role === 'admin') return true;
    return false;
  }

  /**
   * Get user's permission level for a form
   */
  static getUserPermissionLevel(form: UserFormDefinition, userId: string): 'owner' | 'admin' | 'editor' | 'viewer' | 'none' {
    if (form.createdBy === userId) return 'owner';
    const share = form.sharedWith?.find(p => p.userId === userId);
    if (share) return share.role;
    if (form.isPublic) return 'viewer';
    return 'none';
  }

  // ============================================================================
  // Form Submissions
  // ============================================================================

  /**
   * Submit form data
   */
  static async submitForm(
    formId: string,
    userId: string,
    data: Record<string, any>,
    metadata?: { ipAddress?: string; userAgent?: string; source?: 'web' | 'mobile' | 'api' }
  ): Promise<FormSubmission> {
    const form = await this.getForm(formId, userId);

    if (!form) {
      throw new Error('Form not found or access denied');
    }

    // Check if form allows multiple submissions
    if (!form.settings?.allowMultipleSubmissions) {
      const existingSubmissions = await this.getUserSubmissions(formId, userId, { limit: 1 });
      if (existingSubmissions.length > 0) {
        throw new Error('You have already submitted this form. Multiple submissions are not allowed.');
      }
    }

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Calculate calculated fields
    const calculatedFields: Record<string, any> = {};
    form.fields.forEach(field => {
      if (field.type === 'calculated' && field.calculation) {
        try {
          calculatedFields[field.id] = this.calculateFieldValue(field, data, calculatedFields);
        } catch (e) {
          console.warn(`Failed to calculate field ${field.id}:`, e);
        }
      }
    });

    const submission: FormSubmission = {
      id: submissionId,
      formId,
      submittedBy: userId,
      submittedAt: now,
      data,
      calculatedFields,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      source: metadata?.source || 'web',
      status: 'active'
    };

    await setDoc(doc(db, this.SUBMISSIONS_COLLECTION, submissionId), submission);

    // Update form summary
    await this.updateFormSummary(formId);

    return submission;
  }

  /**
   * Get submissions for a form
   * Only returns submissions if user has access to the form
   */
  static async getFormSubmissions(
    formId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: 'active' | 'edited' | 'deleted' | 'all';
      startDate?: string;
      endDate?: string;
      filters?: Record<string, any>;
    }
  ): Promise<FormSubmission[]> {
    const form = await this.getForm(formId, userId);

    if (!form) {
      throw new Error('Form not found or access denied');
    }

    let q = query(
      collection(db, this.SUBMISSIONS_COLLECTION),
      where('formId', '==', formId),
      orderBy('submittedAt', 'desc')
    );

    if (options?.status && options.status !== 'all') {
      q = query(q, where('status', '==', options.status));
    }

    if (options?.startDate) {
      q = query(q, where('submittedAt', '>=', options.startDate));
    }

    if (options?.endDate) {
      q = query(q, where('submittedAt', '<=', options.endDate));
    }

    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const snapshot = await getDocs(q);
    const submissions: FormSubmission[] = [];

    snapshot.forEach(doc => {
      submissions.push(doc.data() as FormSubmission);
    });

    return submissions;
  }

  /**
   * Get submissions by a specific user
   */
  static async getUserSubmissions(
    formId: string,
    userId: string,
    options?: { limit?: number }
  ): Promise<FormSubmission[]> {
    let q = query(
      collection(db, this.SUBMISSIONS_COLLECTION),
      where('formId', '==', formId),
      where('submittedBy', '==', userId),
      where('status', '==', 'active'),
      orderBy('submittedAt', 'desc')
    );

    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const snapshot = await getDocs(q);
    const submissions: FormSubmission[] = [];

    snapshot.forEach(doc => {
      submissions.push(doc.data() as FormSubmission);
    });

    return submissions;
  }

  /**
   * Update a submission
   */
  static async updateSubmission(
    submissionId: string,
    userId: string,
    updates: { data?: Record<string, any>; status?: FormSubmission['status'] }
  ): Promise<FormSubmission | null> {
    const docRef = doc(db, this.SUBMISSIONS_COLLECTION, submissionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const submission = docSnap.data() as FormSubmission;

    // Check permissions - only owner or form editor can update
    const form = await this.getForm(submission.formId, userId);
    if (!form) {
      throw new Error('Access denied');
    }

    if (submission.submittedBy !== userId && !this.canEdit(form, userId)) {
      throw new Error('You do not have permission to update this submission');
    }

    const now = new Date().toISOString();

    // Record changes in history
    const changes: Record<string, { old: any; new: any }> = {};
    if (updates.data) {
      Object.entries(updates.data).forEach(([key, value]) => {
        if (submission.data[key] !== value) {
          changes[key] = { old: submission.data[key], new: value };
        }
      });
    }

    const updateData: any = {
      updatedAt: now
    };

    if (updates.data) {
      updateData.data = { ...submission.data, ...updates.data };

      // Recalculate calculated fields
      form.fields.forEach(field => {
        if (field.type === 'calculated' && field.calculation) {
          try {
            updateData[`calculatedFields.${field.id}`] = this.calculateFieldValue(
              field,
              updateData.data,
              {}
            );
          } catch (e) {
            console.warn(`Failed to recalculate field ${field.id}:`, e);
          }
        }
      });
    }

    if (updates.status) {
      updateData.status = updates.status;
    }

    // Add to edit history
    if (Object.keys(changes).length > 0) {
      const editEntry = {
        editedAt: now,
        editedBy: userId,
        changes
      };
      updateData.editHistory = [...(submission.editHistory || []), editEntry];
    }

    await updateDoc(docRef, updateData);

    return { ...submission, ...updateData } as FormSubmission;
  }

  /**
   * Delete a submission (soft delete)
   */
  static async deleteSubmission(submissionId: string, userId: string): Promise<boolean> {
    const docRef = doc(db, this.SUBMISSIONS_COLLECTION, submissionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return false;
    }

    const submission = docSnap.data() as FormSubmission;

    // Check permissions
    const form = await this.getForm(submission.formId, userId);
    if (!form) {
      throw new Error('Access denied');
    }

    if (submission.submittedBy !== userId && !this.canDelete(form, userId)) {
      throw new Error('You do not have permission to delete this submission');
    }

    await updateDoc(docRef, {
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      deletedBy: userId
    });

    await this.updateFormSummary(submission.formId);

    return true;
  }

  // ============================================================================
  // Form Summaries
  // ============================================================================

  /**
   * Get summary statistics for a form
   */
  static async getFormSummary(formId: string, userId: string): Promise<FormSummary | null> {
    const form = await this.getForm(formId, userId);
    if (!form) {
      throw new Error('Form not found or access denied');
    }

    const docRef = doc(db, this.SUMMARIES_COLLECTION, formId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as FormSummary;
    }

    // Generate summary on the fly
    return this.generateFormSummary(formId);
  }

  /**
   * Update form summary statistics
   */
  private static async updateFormSummary(formId: string): Promise<void> {
    const summary = await this.generateFormSummary(formId);
    await setDoc(doc(db, this.SUMMARIES_COLLECTION, formId), summary);
  }

  /**
   * Generate summary statistics for a form
   */
  private static async generateFormSummary(formId: string): Promise<FormSummary> {
    const q = query(
      collection(db, this.SUBMISSIONS_COLLECTION),
      where('formId', '==', formId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const submissions: FormSubmission[] = [];
    const uniqueSubmitters = new Set<string>();

    snapshot.forEach(doc => {
      const sub = doc.data() as FormSubmission;
      submissions.push(sub);
      uniqueSubmitters.add(sub.submittedBy);
    });

    // Calculate field counts
    const fieldCounts: Record<string, { filled: number; empty: number }> = {};
    submissions.forEach(sub => {
      Object.entries(sub.data).forEach(([fieldId, value]) => {
        if (!fieldCounts[fieldId]) {
          fieldCounts[fieldId] = { filled: 0, empty: 0 };
        }
        if (value !== null && value !== undefined && value !== '') {
          fieldCounts[fieldId].filled++;
        } else {
          fieldCounts[fieldId].empty++;
        }
      });
    });

    return {
      formId,
      totalSubmissions: submissions.length,
      lastSubmissionAt: submissions[0]?.submittedAt,
      uniqueSubmitters: uniqueSubmitters.size,
      fieldCounts
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Calculate the value of a calculated field
   */
  private static calculateFieldValue(
    field: FormField,
    data: Record<string, any>,
    calculatedFields: Record<string, any>
  ): any {
    if (!field.calculation?.formula) return null;

    const formula = field.calculation.formula;

    // Replace field references [fieldId] with actual values
    const evaluatedFormula = formula.replace(/\[([^\]]+)\]/g, (match, fieldId) => {
      const value = data[fieldId] ?? calculatedFields[fieldId] ?? 0;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? '0' : parsed.toString();
    });

    try {
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + evaluatedFormula)();

      if (field.calculation.decimalPlaces !== undefined) {
        return parseFloat(result.toFixed(field.calculation.decimalPlaces));
      }

      return result;
    } catch (e) {
      console.warn('Failed to evaluate formula:', formula, e);
      return null;
    }
  }

  /**
   * Duplicate an existing form (for templates or copying)
   */
  static async duplicateForm(
    sourceFormId: string,
    userId: string,
    newName?: string
  ): Promise<UserFormDefinition> {
    const sourceForm = await this.getForm(sourceFormId, userId);

    if (!sourceForm) {
      throw new Error('Source form not found or access denied');
    }

    if (!this.canEdit(sourceForm, userId)) {
      throw new Error('You do not have permission to duplicate this form');
    }

    const duplicatedForm = await this.createForm(userId, {
      name: newName || `${sourceForm.name} (Copy)`,
      description: sourceForm.description,
      fields: sourceForm.fields.map(f => ({ ...f, id: `${f.id}_copy_${Date.now()}` })),
      settings: sourceForm.settings,
      category: sourceForm.category,
      tags: sourceForm.tags
    });

    return duplicatedForm;
  }

  /**
   * Clear the cache
   */
  static clearCache(): void {
    this.formCache.clear();
  }
}

export default UserFormBuilderService;
