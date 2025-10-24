from django.shortcuts import render, redirect, get_object_or_404, get_object_or_404
from django.contrib.auth.models import User, Group
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout, authenticate, login
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
from django.utils.dateparse import parse_date
from django.http import HttpResponse, JsonResponse
from django.utils.timezone import now
from django.db.utils import IntegrityError
from django.db import IntegrityError, transaction
from datetime import datetime, date
from .models import *
from .forms import *
import json

def is_responsavel(user):
    """
    Retorna True se o usuário pertencer a um grupo 'Responsavel', 
    'Responsaveis' ou 'Responsáveis' (ignorando maiúsculas/minúsculas e acentos).
    """
    grupos = user.groups.values_list('name', flat=True)
    for nome in grupos:
        nome_normalizado = nome.lower().replace("í", "i").replace("é", "e").replace("ê", "e")
        if nome_normalizado in ("responsavel", "responsaveis"):
            return True
    return False

def Homepage(request):
    context = {'dados_home': homepage.objects.all()}
    return render(request, 'homepage.html', context)

def Login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            messages.success(request, f"Login realizado com sucesso! Bem-vindo, {user.username}. ✅")
            return redirect('homepage')
        else:
            messages.error(request, "Usuário ou senha inválida. ❌")
            return render(request, 'Login.html')
    return render(request, 'Login.html')


@login_required
def Sair(request):
    logout(request)
    messages.success(request, "Logout realizado com sucesso! 👋")
    return redirect('homepage')

#funções relacionadas a pagina To-Do
@login_required
def todo_page(request):
    casa_ativa = None
    casa_id = request.session.get('casa_ativa_id')
    if casa_id:
        from SmartDayApp.models import Casa
        casa_ativa = Casa.objects.filter(id=casa_id).first()

    return render(request, 'todo.html', {'casa_ativa': casa_ativa})

def get_casa_ativa(request):
    casa_id = request.session.get('casa_ativa_id')
    if not casa_id:
        return None
    return Casa.objects.filter(id=casa_id).first()

def is_responsavel_na_casa(user, casa):
    membro = CasaMembro.objects.filter(usuario=user, casa=casa).first()
    return membro and membro.papel == "Responsavel"

@login_required
def listar_tarefas(request):
    casa = get_casa_ativa(request)
    if not casa:
        return JsonResponse({'erro': 'Nenhuma casa ativa selecionada.'}, status=400)

    data = request.GET.get('data')
    if not data:
        return JsonResponse({'erro': 'Data não informada'}, status=400)

    data_obj = parse_date(data)

    tarefas = Tarefa.objects.filter(
        casa=casa,
        data_inicio__lte=data_obj,
        data_fim__gte=data_obj
    ).order_by('concluida', 'data_fim')

    tarefas_json = [
        {
            'id': t.id,
            'titulo': t.titulo,
            'descricao': t.descricao,
            'concluida': t.concluida,
            'data_inicio': t.data_inicio.strftime('%Y-%m-%d'),
            'data_fim': t.data_fim.strftime('%Y-%m-%d'),
            'criado_por': t.criado_por.username,
        }
        for t in tarefas
    ]

    usuario = request.user.username
    is_responsavel_user = is_responsavel_na_casa(request.user, casa)

    return JsonResponse({
        'tarefas': tarefas_json,
        'usuario': usuario,
        'is_responsavel': is_responsavel_user,
        'casa_nome': casa.nome,
    })

@login_required
@require_POST
def criar_tarefa(request):
    casa = get_casa_ativa(request)
    if not casa:
        return JsonResponse({'erro': 'Nenhuma casa ativa selecionada.'}, status=400)

    data = json.loads(request.body)

    try:
        data_inicio = parse_date(data.get('data_inicio'))
        data_fim = parse_date(data.get('data_fim'))

        if data_inicio and data_fim and data_fim < data_inicio:
            return JsonResponse({'erro': 'A data de término não pode ser anterior à data de início.'}, status=400)

        tarefa = Tarefa.objects.create(
            titulo=data.get('titulo'),
            descricao=data.get('descricao', ''),
            data_inicio=data_inicio,
            data_fim=data_fim,
            criado_por=request.user,
            casa=casa
        )

        return JsonResponse({'mensagem': 'Tarefa criada com sucesso!'})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=400)

@login_required
@require_POST
def excluir_tarefa(request, id):
    try:
        tarefa = get_object_or_404(Tarefa, id=id)
        casa = tarefa.casa

        if not (is_responsavel_na_casa(request.user, casa) or tarefa.criado_por == request.user):
            return JsonResponse({"erro": "Sem permissão para excluir."}, status=403)

        tarefa.delete()
        return JsonResponse({"mensagem": "Tarefa excluída com sucesso!"})
    except Exception as e:
        return JsonResponse({"erro": str(e)}, status=400)

@login_required
@require_POST
def editar_tarefa(request, id):
    try:
        tarefa = get_object_or_404(Tarefa, id=id)
        casa = tarefa.casa

        if not (is_responsavel_na_casa(request.user, casa) or tarefa.criado_por == request.user):
            return JsonResponse({"erro": "Sem permissão para editar."}, status=403)

        data = json.loads(request.body)
        data_inicio = parse_date(data.get("data_inicio")) or tarefa.data_inicio
        data_fim = parse_date(data.get("data_fim")) or tarefa.data_fim

        if data_fim < data_inicio:
            return JsonResponse({"erro": "Data final não pode ser anterior à inicial."}, status=400)

        tarefa.titulo = data.get("titulo", tarefa.titulo)
        tarefa.descricao = data.get("descricao", tarefa.descricao)
        tarefa.data_inicio = data_inicio
        tarefa.data_fim = data_fim
        tarefa.save()

        return JsonResponse({"mensagem": "Tarefa atualizada com sucesso!"})
    except Exception as e:
        return JsonResponse({"erro": str(e)}, status=400)

@login_required
@require_POST
def atualizar_status(request, id):
    try:
        tarefa = get_object_or_404(Tarefa, id=id)
        casa = tarefa.casa

        if not (is_responsavel_na_casa(request.user, casa) or tarefa.criado_por == request.user):
            return JsonResponse({"erro": "Sem permissão para alterar status."}, status=403)

        tarefa.concluida = not tarefa.concluida
        tarefa.save()

        return JsonResponse({'status': tarefa.concluida})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=400)

#Realiza a troca do tema do site
def toggle_theme(request):
    request.session['dark_mode'] = not request.session.get('dark_mode', False)
    return HttpResponse('OK')

#views relacionadas a criação das casas
@login_required
def minha_casa_page(request):
    casas = Casa.objects.filter(models.Q(dono=request.user) | models.Q(membros_relacionados__usuario=request.user)).distinct()

    casa_ativa = None
    membros_relacionados = []
    usuarios_disponiveis = []

    casa_id = request.session.get('casa_ativa_id')
    if casa_id:
        casa_ativa = Casa.objects.filter(id=casa_id).first()
        if casa_ativa:
            membros_relacionados = CasaMembro.objects.filter(casa=casa_ativa).select_related('usuario')
            usuarios_em_casa = [cm.usuario.id for cm in membros_relacionados]
            usuarios_disponiveis = User.objects.exclude(id__in=usuarios_em_casa)

    return render(request, 'minha_casa.html', {
        'casas': casas,
        'casa_ativa': casa_ativa,
        'membros_relacionados': membros_relacionados,
        'usuarios_disponiveis': usuarios_disponiveis,
    })

@login_required
def criar_casa(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            nome = data.get('nome')
            if not nome:
                return JsonResponse({'erro': 'Nome é obrigatório.'}, status=400)

            casa = Casa.objects.create(nome=nome, dono=request.user)
            Group.objects.get_or_create(name=nome)

            return JsonResponse({'mensagem': f'Casa "{casa.nome}" criada com sucesso!'})
        except Exception as e:
            return JsonResponse({'erro': str(e)}, status=400)
    else:
        return JsonResponse({'erro': 'Método não permitido.'}, status=405)

@login_required
def gerenciar_casa(request, id):
    casa = get_object_or_404(Casa, id=id)

    if not (casa.dono == request.user or casa.membros.filter(id=request.user.id).exists()):
        messages.error(request, "Você não faz parte desta casa.")
        return redirect('minha_casa')

    request.session['casa_ativa_id'] = casa.id

    return redirect('minha_casa')

@login_required
@require_POST
def adicionar_usuario_casa(request, id):
    casa = get_object_or_404(Casa, id=id)
    if casa.dono != request.user:
        return JsonResponse({'erro': 'Sem permissão.'}, status=403)

    data = json.loads(request.body)
    usuario_id = data.get('usuario_id')
    usuario = get_object_or_404(User, id=usuario_id)

    CasaMembro.objects.get_or_create(casa=casa, usuario=usuario, defaults={'papel': 'Usuarios'})
    return JsonResponse({'mensagem': f'{usuario.username} foi adicionado como Usuário.'})

@login_required
@require_POST
def remover_usuario_casa(request, id, user_id):
    casa = get_object_or_404(Casa, id=id)
    if casa.dono != request.user:
        return JsonResponse({'erro': 'Sem permissão.'}, status=403)

    CasaMembro.objects.filter(casa=casa, usuario_id=user_id).delete()
    return JsonResponse({'mensagem': 'Usuário removido com sucesso.'})

@login_required
@require_POST
def editar_casa(request, id):
    try:
        casa = get_object_or_404(Casa, id=id)
        if casa.dono != request.user:
            return JsonResponse({'erro': 'Apenas o dono pode editar a casa.'}, status=403)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'erro': 'JSON inválido.'}, status=400)

        novo_nome = (data.get('nome') or '').strip()
        if not novo_nome:
            return JsonResponse({'erro': 'Nome inválido.'}, status=400)

        if Casa.objects.exclude(id=casa.id).filter(nome__iexact=novo_nome).exists():
            return JsonResponse({'erro': 'Já existe outra casa com esse nome.'}, status=400)

        casa.nome = novo_nome
        casa.save()

        return JsonResponse({'mensagem': 'Casa atualizada com sucesso.', 'novo_nome': casa.nome})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)

@login_required
@require_POST
def excluir_casa(request, id):
    try:
        casa = get_object_or_404(Casa, id=id)
        if casa.dono != request.user:
            return JsonResponse({'erro': 'Apenas o dono pode excluir a casa.'}, status=403)

        casa.delete()

        if request.session.get('casa_ativa_id') == id:
            try:
                del request.session['casa_ativa_id']
            except KeyError:
                pass

        return JsonResponse({'mensagem': 'Casa excluída com sucesso.'})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)

@login_required
@require_POST
def definir_papel(request, id):
    casa = get_object_or_404(Casa, id=id)
    if casa.dono != request.user:
        return JsonResponse({'erro': 'Sem permissão.'}, status=403)

    data = json.loads(request.body)
    usuario_id = data.get('usuario_id')
    papel = data.get('papel')

    if papel not in ['Usuarios', 'Responsavel']:
        return JsonResponse({'erro': 'Papel inválido.'}, status=400)

    membro = get_object_or_404(CasaMembro, casa=casa, usuario_id=usuario_id)
    membro.papel = papel
    membro.save()

    return JsonResponse({'mensagem': f'Permissão atualizada: {membro.usuario.username} agora é {papel}.'})