import { Student, Payment, Lesson } from '../types';

/**
 * Synchronizes a student's lessons and payments to support both prepayment (package)
 * and postpaid (lesson-by-lesson) flows perfectly.
 * 
 * - For prepaid lessons (when credits > 0 from a packages payment):
 *   The conducted lessons consume the prepaid credits, so they remain marked as paid but do not
 *   generate double-payment records.
 * - For postpaid lessons (when credits === 0):
 *   If a conducted lesson is marked as paid (isPaid === true), an automatic payment is created
 *   for that lesson's date. This instantly updates "Real earnings" and maintains balanceLessons correctly.
 *   If the lesson is marked as unpaid (isPaid === false), no payment is generated, reflecting a debt.
 */
export function syncStudentLessonsAndPayments(student: Student): Student {
  // Sort lessons chronologically (oldest to newest) to process in sequence
  const chronLessons = [...student.lessons].sort((a, b) => 
    a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')
  );

  // Filter out any existing auto-payments first to re-evaluate them cleanly
  const manualPayments = student.payments.filter(p => !p.id.startsWith('pay-auto-'));
  // Sort manual payments chronologically
  const chronManualPayments = [...manualPayments].sort((a, b) => a.date.localeCompare(b.date));

  let credits = 0;
  let paymentIdx = 0;
  const autoPaymentsToAdd: Payment[] = [];

  // Helper to consume manual payments made on or before a certain date
  const consumePaymentsUpTo = (date: string) => {
    while (paymentIdx < chronManualPayments.length && chronManualPayments[paymentIdx].date <= date) {
      credits += chronManualPayments[paymentIdx].lessonsPaid;
      paymentIdx++;
    }
  };

  chronLessons.forEach(lesson => {
    // Consume manual payments up to this lesson's date
    consumePaymentsUpTo(lesson.date);

    const isConducted = lesson.status === 'attended' || lesson.status === 'missed_unexcused';
    if (isConducted) {
      if (lesson.isPaid) {
        if (credits > 0) {
          // Covered by prepaid credits from a manual package payment
          credits--;
        } else {
          // No prepaid credits left! This is a postpaid lesson.
          // Create/ensure an automatic payment exists for this lesson
          autoPaymentsToAdd.push({
            id: 'pay-auto-' + lesson.id,
            date: lesson.date,
            amount: student.hourlyRate,
            lessonsPaid: 1,
            method: 'СБП',
            notes: `Авто: Оплата занятия от ${lesson.date}`
          });
        }
      } else {
        // Unpaid lesson (debt) - does not consume credits, does not generate a payment
      }
    }
  });

  // Load any remaining manual payments after the last lesson
  while (paymentIdx < chronManualPayments.length) {
    credits += chronManualPayments[paymentIdx].lessonsPaid;
    paymentIdx++;
  }

  // Combine manual payments and our newly generated auto payments
  const allPayments = [...manualPayments, ...autoPaymentsToAdd];
  
  // Sort payments newest to oldest (default UI presentation order)
  allPayments.sort((a, b) => b.date.localeCompare(a.date));

  // Recalculate balanceLessons:
  // (Total purchased from manual payments + individual paid lessons) MINUS (total completed lessons)
  const totalPurchasedAndAuto = allPayments.reduce((sum, p) => sum + p.lessonsPaid, 0);
  const countConducted = student.lessons.filter(l => l.status === 'attended' || l.status === 'missed_unexcused').length;
  const calculatedBalance = totalPurchasedAndAuto - countConducted;

  return {
    ...student,
    payments: allPayments,
    balanceLessons: calculatedBalance
  };
}

/**
 * Synchronizes an array of students.
 */
export function syncAllStudents(students: Student[]): Student[] {
  return students.map(syncStudentLessonsAndPayments);
}
