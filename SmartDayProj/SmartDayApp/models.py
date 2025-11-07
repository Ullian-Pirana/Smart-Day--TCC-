from django.db import models
from django.contrib.auth.models import User
import datetime

class homepage(models.Model):
    titulo = models.CharField(max_length=50)
    descricao = models.TextField(max_length=1000)
    logo = models.ImageField(upload_to='homepage/')

    def __str__(self):
        return self.titulo

# Models da funcionalidade de CASAS

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
    
# Models para funcionalidades da pagina To-Do

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
    
class ItemCompra(models.Model):
    casa = models.ForeignKey(Casa, on_delete=models.CASCADE, related_name='itens_compra')
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE)
    nome = models.CharField(max_length=200)
    valor_unitario = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    quantidade = models.PositiveIntegerField(default=1)
    aprovado = models.BooleanField(default=False)
    comprado = models.BooleanField(default=False)
    data_criacao = models.DateTimeField(auto_now_add=True)

    def total(self):
        if self.valor_unitario:
            return self.valor_unitario * self.quantidade
        return None

    def __str__(self):
        return self.nome

#   Models para funcionalidades da pagina de Finanças

class RendaMensal(models.Model):
    casa = models.ForeignKey(Casa, on_delete=models.CASCADE, related_name='rendas')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data = models.DateField(default=datetime.date.today)
    nota = models.TextField(blank=True)

    def __str__(self):
        return f"Entrada R${self.valor} - {self.casa.nome}"


class Gasto(models.Model):
    CATEGORIAS = [
        ('renda', 'Entrada'),
        ('gasto', 'Saída'),
    ]

    casa = models.ForeignKey(Casa, on_delete=models.CASCADE, related_name='gastos')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data = models.DateField(default=datetime.date.today)
    local = models.CharField(max_length=100, blank=True)
    nota = models.TextField(blank=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIAS)

    def __str__(self):
        return f"{self.categoria} - R${self.valor}"