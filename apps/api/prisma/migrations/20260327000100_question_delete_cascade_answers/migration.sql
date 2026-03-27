-- Allow deleting questions/options even when responses exist.
-- Related answers and answer-option rows are removed automatically.

ALTER TABLE "Answer" DROP CONSTRAINT "Answer_questionId_fkey";
ALTER TABLE "AnswerOption" DROP CONSTRAINT "AnswerOption_questionOptionId_fkey";

ALTER TABLE "Answer"
  ADD CONSTRAINT "Answer_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnswerOption"
  ADD CONSTRAINT "AnswerOption_questionOptionId_fkey"
  FOREIGN KEY ("questionOptionId") REFERENCES "QuestionOption"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
