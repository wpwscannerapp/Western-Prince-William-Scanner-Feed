-- Rename the function
ALTER FUNCTION public.notify_onesignal_on_new_alert() RENAME TO notify_web_push_on_new_alert;

-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_new_alert_send_notification ON public.alerts;

-- Recreate the trigger with the new function name
CREATE TRIGGER on_new_alert_send_notification
  AFTER INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_web_push_on_new_alert();