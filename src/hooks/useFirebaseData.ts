import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, writeBatch, where, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { ProgressData } from '../types';

export interface Level {
  id: string;
  name: string;
  createdAt: any;
}

export interface Student {
  id: string;
  name: string;
  levelId: string;
  progress: ProgressData;
  createdAt: any;
  updatedAt: any;
}

export function useFirebaseData(userId: string | undefined) {
  const [levels, setLevels] = useState<Level[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLevels([]);
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const levelsRef = collection(db, 'users', userId, 'levels');
    const unsubscribeLevels = onSnapshot(levelsRef, (snapshot) => {
      const newLevels: Level[] = [];
      snapshot.forEach(doc => newLevels.push({ id: doc.id, ...doc.data() } as Level));
      // Sort by name or creation
      newLevels.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      setLevels(newLevels);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/levels`));

    const studentsRef = collection(db, 'users', userId, 'students');
    const unsubscribeStudents = onSnapshot(studentsRef, (snapshot) => {
      const newStudents: Student[] = [];
      snapshot.forEach(doc => newStudents.push({ id: doc.id, ...doc.data() } as Student));
      newStudents.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      setStudents(newStudents);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/students`));

    return () => {
      unsubscribeLevels();
      unsubscribeStudents();
    };
  }, [userId]);

  const addLevel = async (name: string): Promise<string | undefined> => {
    if (!userId) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const newDocRef = doc(collection(db, 'users', userId, 'levels'));
    try {
      await setDoc(newDocRef, {
        name: trimmed,
        createdAt: serverTimestamp()
      });
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}/levels`);
    }
  };

  const updateLevelName = async (levelId: string, newName: string): Promise<boolean> => {
    if (!userId) return false;
    const trimmed = newName.trim();
    if (!trimmed) return false;
    try {
      await updateDoc(doc(db, 'users', userId, 'levels', levelId), {
        name: trimmed
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/levels/${levelId}`);
      return false;
    }
  };

  const deleteLevel = async (levelId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const studentsQuery = query(collection(db, 'users', userId, 'students'), where('levelId', '==', levelId));
      const studentsSnapshot = await getDocs(studentsQuery);

      const docsToDelete = [
        doc(db, 'users', userId, 'levels', levelId),
        ...studentsSnapshot.docs.map(d => d.ref)
      ];

      const batchSize = 450;
      for (let i = 0; i < docsToDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docsToDelete.slice(i, i + batchSize);
        chunk.forEach(ref => batch.delete(ref));
        await batch.commit();
      }

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/levels/${levelId}`);
      return false;
    }
  };

  const addStudent = async (name: string, levelId: string, initialProgress: ProgressData) => {
    if (!userId) return;
    const newDocRef = doc(collection(db, 'users', userId, 'students'));
    try {
      await setDoc(newDocRef, {
        name: name.trim(),
        levelId,
        progress: initialProgress,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}/students`);
    }
  };

  const batchUpdateStudentProgress = async (updates: Record<string, ProgressData>) => {
    if (!userId) return false;
    try {
      const entries = Object.entries(updates);
      const batchSize = 450;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = entries.slice(i, i + batchSize);
        for (const [studentId, progress] of chunk) {
          batch.update(doc(db, 'users', userId, 'students', studentId), {
            progress,
            updatedAt: serverTimestamp()
          });
        }
        await batch.commit();
      }
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/students/batch`);
      return false;
    }
  };

  const updateStudentProgress = async (studentId: string, progress: ProgressData) => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'users', userId, 'students', studentId), {
        progress,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/students/${studentId}`);
    }
  };

  const updateStudentName = async (studentId: string, name: string) => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'users', userId, 'students', studentId), {
        name: name.trim(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/students/${studentId}`);
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'students', studentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/students/${studentId}`);
    }
  };

  return {
    levels,
    students,
    loading,
    addLevel,
    updateLevelName,
    deleteLevel,
    addStudent,
    updateStudentProgress,
    batchUpdateStudentProgress,
    updateStudentName,
    deleteStudent
  };
}
