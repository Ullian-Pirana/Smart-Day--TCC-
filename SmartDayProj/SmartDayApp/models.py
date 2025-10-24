from django.db import models
from django.contrib.auth.models import User

class homepage(models.Model):
    titulo = models.CharField(max_length=50)
    descricao = models.TextField(max_length=1000)
    logo = models.ImageField(upload_to='homepage/')

    def __str__(self):
        return self.titulo

class Casa(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    dono = models.ForeignKey(User, on_delete=models.CASCADE, related_name='casas_criadas')
    membros = models.ManyToManyField(User, related_name='casas', blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome
    
class CasaMembro(models.Model):
    PAPEL_CHOICES = [
        ('Usuarios', 'Usuário'),
        ('Responsavel', 'Responsável'),
    ]

    casa = models.ForeignKey(Casa, on_delete=models.CASCADE, related_name='membros_relacionados')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='casas_relacionadas')
    papel = models.CharField(max_length=20, choices=PAPEL_CHOICES, default='Usuarios')

    class Meta:
        unique_together = ('casa', 'usuario')

    def __str__(self):
        return f'{self.usuario.username} - {self.casa.nome} ({self.papel})'
    
class Tarefa(models.Model):
    titulo = models.CharField(max_length=100)
    descricao = models.TextField(blank=True)
    data_inicio = models.DateField()
    data_fim = models.DateField()
    concluida = models.BooleanField(default=False)
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE)
    criado_em = models.DateTimeField(auto_now_add=True)
    casa = models.ForeignKey(Casa, on_delete=models.CASCADE, related_name='tarefas', null=True, blank=True)

    def __str__(self):
        return f"{self.titulo} ({self.casa.nome})"