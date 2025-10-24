from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import Group
from .models import Casa

@receiver(post_save, sender=Casa)
def criar_grupo_para_casa(sender, instance, created, **kwargs):
    if created:
        Group.objects.get_or_create(name=instance.nome)
        # adiciona o dono ao grupo da casa
        grupo, _ = Group.objects.get_or_create(name=instance.nome)
        instance.dono.groups.add(grupo)