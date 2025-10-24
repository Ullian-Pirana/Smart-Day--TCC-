from django.apps import AppConfig

class SmartdayappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'SmartDayApp'

    def ready(self):
        import SmartDayApp.signals  